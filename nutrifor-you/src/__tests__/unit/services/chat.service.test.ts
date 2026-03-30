import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import {
  buildChatConversation,
  buildChatParticipant,
  buildChatMessage,
} from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

describe('createConversation', () => {
  it('creates conversation with participants including creator', async () => {
    const conversation = buildChatConversation({
      participants: [
        buildChatParticipant({ userId: 'creator-1' }),
        buildChatParticipant({ userId: 'user-2' }),
      ],
    })
    prisma.chatConversation.create.mockResolvedValue(conversation)

    const { createConversation } = await import('@/services/chat.service')
    const result = await createConversation('creator-1', {
      participantIds: ['user-2'],
      isGroup: false,
    })

    expect(prisma.chatConversation.create).toHaveBeenCalledWith({
      data: {
        title: undefined,
        isGroup: false,
        participants: {
          create: expect.arrayContaining([
            { userId: 'creator-1' },
            { userId: 'user-2' },
          ]),
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
    expect(result).toEqual(conversation)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'creator-1',
      action: 'CREATE',
      entity: 'ChatConversation',
      entityId: conversation.id,
      details: { participantCount: 2 },
    })
  })

  it('deduplicates participant IDs', async () => {
    const conversation = buildChatConversation()
    prisma.chatConversation.create.mockResolvedValue(conversation)

    const { createConversation } = await import('@/services/chat.service')
    await createConversation('user-1', {
      participantIds: ['user-1', 'user-2', 'user-2'],
      isGroup: false,
    })

    expect(prisma.chatConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participants: {
            create: [{ userId: 'user-1' }, { userId: 'user-2' }],
          },
        }),
      })
    )
  })
})

describe('getConversation', () => {
  it('returns conversation for participant', async () => {
    const conversation = buildChatConversation()
    prisma.chatConversation.findFirst.mockResolvedValue(conversation)

    const { getConversation } = await import('@/services/chat.service')
    const result = await getConversation('conv-1', 'user-1')

    expect(prisma.chatConversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conv-1',
        participants: { some: { userId: 'user-1' } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
    expect(result).toEqual(conversation)
  })

  it('returns null for non-participant', async () => {
    prisma.chatConversation.findFirst.mockResolvedValue(null)

    const { getConversation } = await import('@/services/chat.service')
    const result = await getConversation('conv-1', 'outsider')

    expect(result).toBeNull()
  })
})

describe('listConversations', () => {
  it('returns paginated conversations', async () => {
    const conversations = [buildChatConversation(), buildChatConversation()]
    prisma.chatConversation.findMany.mockResolvedValue(conversations)
    prisma.chatConversation.count.mockResolvedValue(2)

    const { listConversations } = await import('@/services/chat.service')
    const result = await listConversations('user-1', {})

    expect(prisma.chatConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { participants: { some: { userId: 'user-1' } } },
        skip: 0,
        take: 20,
      })
    )
    expect(prisma.chatConversation.count).toHaveBeenCalledWith({
      where: { participants: { some: { userId: 'user-1' } } },
    })
    expect(result.data).toEqual(conversations)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })
})

describe('sendMessage', () => {
  it('sends message and updates conversation lastMessageAt', async () => {
    const participant = buildChatParticipant({ userId: 'sender-1' })
    const message = buildChatMessage({ conversationId: 'conv-1', senderId: 'sender-1' })

    prisma.chatParticipant.findFirst.mockResolvedValue(participant)
    prisma.$transaction.mockResolvedValue([message, {}, {}])

    const { sendMessage } = await import('@/services/chat.service')
    const result = await sendMessage('conv-1', 'sender-1', { content: 'Hello!' })

    expect(prisma.chatParticipant.findFirst).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1', userId: 'sender-1' },
    })
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(result).toEqual(message)
  })

  it('throws when not a participant', async () => {
    prisma.chatParticipant.findFirst.mockResolvedValue(null)

    const { sendMessage } = await import('@/services/chat.service')
    await expect(
      sendMessage('conv-1', 'outsider', { content: 'Hello!' })
    ).rejects.toThrow('Not a participant of this conversation')
  })
})

describe('listMessages', () => {
  it('returns messages in chronological order (reversed)', async () => {
    const msg1 = buildChatMessage({ content: 'First' })
    const msg2 = buildChatMessage({ content: 'Second' })
    const participant = buildChatParticipant({ userId: 'user-1' })

    prisma.chatParticipant.findFirst.mockResolvedValue(participant)
    prisma.chatMessage.findMany.mockResolvedValue([msg2, msg1])
    prisma.chatMessage.count.mockResolvedValue(2)
    prisma.chatParticipant.update.mockResolvedValue(participant)

    const { listMessages } = await import('@/services/chat.service')
    const result = await listMessages('conv-1', 'user-1', {})

    expect(result.data).toEqual([msg1, msg2])
    expect(result.pagination).toEqual({ page: 1, perPage: 50, total: 2, totalPages: 1 })
  })

  it('throws when not a participant', async () => {
    prisma.chatParticipant.findFirst.mockResolvedValue(null)

    const { listMessages } = await import('@/services/chat.service')
    await expect(listMessages('conv-1', 'outsider', {})).rejects.toThrow(
      'Not a participant of this conversation'
    )
  })
})

describe('editMessage', () => {
  it('edits message with isEdited=true', async () => {
    const message = buildChatMessage({ senderId: 'user-1' })
    const updated = { ...message, content: 'Edited content', isEdited: true }

    prisma.chatMessage.findFirst.mockResolvedValue(message)
    prisma.chatMessage.update.mockResolvedValue(updated)

    const { editMessage } = await import('@/services/chat.service')
    const result = await editMessage(message.id, 'user-1', 'Edited content')

    expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith({
      where: { id: message.id, senderId: 'user-1', isDeleted: false },
    })
    expect(prisma.chatMessage.update).toHaveBeenCalledWith({
      where: { id: message.id },
      data: { content: 'Edited content', isEdited: true },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    })
    expect(result).toEqual(updated)
  })

  it('throws when message not found', async () => {
    prisma.chatMessage.findFirst.mockResolvedValue(null)

    const { editMessage } = await import('@/services/chat.service')
    await expect(editMessage('bad-id', 'user-1', 'text')).rejects.toThrow('Message not found')
  })
})

describe('deleteMessage', () => {
  it('soft-deletes message', async () => {
    const message = buildChatMessage({ senderId: 'user-1' })
    prisma.chatMessage.findFirst.mockResolvedValue(message)
    prisma.chatMessage.update.mockResolvedValue({
      ...message,
      isDeleted: true,
      content: '[Message deleted]',
    })

    const { deleteMessage } = await import('@/services/chat.service')
    await deleteMessage(message.id, 'user-1')

    expect(prisma.chatMessage.update).toHaveBeenCalledWith({
      where: { id: message.id },
      data: { isDeleted: true, content: '[Message deleted]' },
    })
  })

  it('throws when message not found', async () => {
    prisma.chatMessage.findFirst.mockResolvedValue(null)

    const { deleteMessage } = await import('@/services/chat.service')
    await expect(deleteMessage('bad-id', 'user-1')).rejects.toThrow('Message not found')
  })
})

describe('getOrCreateDirectConversation', () => {
  it('returns existing conversation', async () => {
    const conversation = buildChatConversation({ isGroup: false })
    prisma.chatConversation.findFirst.mockResolvedValue(conversation)

    const { getOrCreateDirectConversation } = await import('@/services/chat.service')
    const result = await getOrCreateDirectConversation('user-1', 'user-2')

    expect(prisma.chatConversation.findFirst).toHaveBeenCalledWith({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: 'user-1' } } },
          { participants: { some: { userId: 'user-2' } } },
        ],
        participants: { every: { userId: { in: ['user-1', 'user-2'] } } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
    expect(result).toEqual(conversation)
    expect(prisma.chatConversation.create).not.toHaveBeenCalled()
  })

  it('creates new when none exists', async () => {
    const newConversation = buildChatConversation({ isGroup: false })
    prisma.chatConversation.findFirst.mockResolvedValue(null)
    prisma.chatConversation.create.mockResolvedValue(newConversation)

    const { getOrCreateDirectConversation } = await import('@/services/chat.service')
    const result = await getOrCreateDirectConversation('user-1', 'user-2')

    expect(prisma.chatConversation.create).toHaveBeenCalled()
    expect(result).toEqual(newConversation)
  })
})
