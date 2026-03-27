import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreateConversationInput, SendMessageInput } from '@/validators/chat.schema'

export async function createConversation(
  userId: string,
  input: CreateConversationInput
) {
  // Include the creator in participants
  const allParticipantIds = Array.from(new Set([userId, ...input.participantIds]))

  const conversation = await prisma.chatConversation.create({
    data: {
      title: input.title,
      isGroup: input.isGroup || allParticipantIds.length > 2,
      participants: {
        create: allParticipantIds.map((id) => ({
          userId: id,
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  await createAuditLog({
    userId,
    action: AuditAction.CREATE,
    entity: 'ChatConversation',
    entityId: conversation.id,
    details: { participantCount: allParticipantIds.length },
  })

  logger.info({ conversationId: conversation.id, userId }, 'Chat conversation created')
  return conversation
}

export async function getConversation(conversationId: string, userId: string) {
  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId } },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  return conversation
}

export async function listConversations(
  userId: string,
  params: { page?: number; perPage?: number }
) {
  const { page = 1, perPage = 20 } = params

  const [conversations, total] = await Promise.all([
    prisma.chatConversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.chatConversation.count({
      where: { participants: { some: { userId } } },
    }),
  ])

  return {
    data: conversations,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: SendMessageInput
) {
  // Verify user is a participant
  const participant = await prisma.chatParticipant.findFirst({
    where: { conversationId, userId: senderId },
  })
  if (!participant) throw new Error('Not a participant of this conversation')

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        type: input.type || 'TEXT',
        content: input.content,
        fileUrl: input.fileUrl,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
    // Mark as read for the sender
    prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    }),
  ])

  logger.info({ messageId: message.id, conversationId, senderId }, 'Chat message sent')
  return message
}

export async function listMessages(
  conversationId: string,
  userId: string,
  params: { page?: number; perPage?: number }
) {
  const { page = 1, perPage = 50 } = params

  // Verify user is a participant
  const participant = await prisma.chatParticipant.findFirst({
    where: { conversationId, userId },
  })
  if (!participant) throw new Error('Not a participant of this conversation')

  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { conversationId, isDeleted: false },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.chatMessage.count({
      where: { conversationId, isDeleted: false },
    }),
  ])

  // Update last read timestamp
  await prisma.chatParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  })

  return {
    data: messages.reverse(), // Return in chronological order
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}

export async function editMessage(
  messageId: string,
  userId: string,
  content: string
) {
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, senderId: userId, isDeleted: false },
  })
  if (!message) throw new Error('Message not found')

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content, isEdited: true },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  })

  logger.info({ messageId, userId }, 'Chat message edited')
  return updated
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, senderId: userId, isDeleted: false },
  })
  if (!message) throw new Error('Message not found')

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, content: '[Message deleted]' },
  })

  logger.info({ messageId, userId }, 'Chat message deleted')
}

export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string
) {
  // Find existing direct conversation between the two users
  const existing = await prisma.chatConversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
      participants: { every: { userId: { in: [userId, otherUserId] } } },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (existing) return existing

  return createConversation(userId, {
    participantIds: [otherUserId],
    isGroup: false,
  })
}
