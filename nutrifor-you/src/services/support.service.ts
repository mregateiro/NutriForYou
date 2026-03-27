import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreateTicketInput, UpdateTicketInput, CreateReplyInput, CreateKBArticleInput, UpdateKBArticleInput } from '@/validators/support.schema'

// ─── Support Tickets ───────────────────────────────────────

export async function createTicket(userId: string, input: CreateTicketInput) {
  const ticket = await prisma.supportTicket.create({
    data: { userId, ...input },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  await createAuditLog({
    userId,
    action: AuditAction.CREATE,
    entity: 'SupportTicket',
    entityId: ticket.id,
    details: { subject: ticket.subject },
  })

  logger.info({ ticketId: ticket.id, userId }, 'Support ticket created')
  return ticket
}

export async function getTicket(ticketId: string, userId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      replies: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) throw new Error('Ticket not found')
  // Non-admin users can only see their own tickets
  if (ticket.userId !== userId) {
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (user?.role !== 'ADMIN') throw new Error('Ticket not found')
  }

  return ticket
}

export async function listTickets(userId: string, params: {
  status?: string
  page?: number
  perPage?: number
  isAdmin?: boolean
}) {
  const { page = 1, perPage = 20, status, isAdmin } = params
  const where: Record<string, unknown> = {}

  if (!isAdmin) where.userId = userId
  if (status) where.status = status

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.supportTicket.count({ where }),
  ])

  return {
    data: tickets,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function updateTicket(ticketId: string, userId: string, input: UpdateTicketInput) {
  const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
  if (!existing) throw new Error('Ticket not found')

  const data: Record<string, unknown> = {}
  if (input.status) {
    data.status = input.status
    if (input.status === 'RESOLVED') data.resolvedAt = new Date()
    if (input.status === 'CLOSED') data.closedAt = new Date()
  }
  if (input.priority) data.priority = input.priority
  if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data,
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'SupportTicket',
    entityId: ticketId,
    details: { updatedFields: Object.keys(input) },
  })

  return ticket
}

export async function replyToTicket(ticketId: string, userId: string, input: CreateReplyInput) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) throw new Error('Ticket not found')

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId,
      userId,
      message: input.message,
      isStaff: user?.role === 'ADMIN',
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  // Update ticket status if staff replies
  if (user?.role === 'ADMIN' && ticket.status === 'OPEN') {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'IN_PROGRESS' },
    })
  }

  return reply
}

// ─── Knowledge Base ────────────────────────────────────────

export async function createKBArticle(authorId: string, input: CreateKBArticleInput) {
  const article = await prisma.knowledgeBaseArticle.create({
    data: { authorId, ...input },
  })

  logger.info({ articleId: article.id, authorId }, 'KB article created')
  return article
}

export async function listKBArticles(params: {
  category?: string
  isPublished?: boolean
  page?: number
  perPage?: number
}) {
  const { page = 1, perPage = 20, category, isPublished } = params
  const where: Record<string, unknown> = {}

  if (category) where.category = category
  if (isPublished !== undefined) where.isPublished = isPublished

  const [articles, total] = await Promise.all([
    prisma.knowledgeBaseArticle.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.knowledgeBaseArticle.count({ where }),
  ])

  return {
    data: articles,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function getKBArticle(slug: string) {
  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { slug },
    include: { author: { select: { id: true, name: true } } },
  })

  if (!article) throw new Error('Article not found')

  await prisma.knowledgeBaseArticle.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  })

  return article
}

export async function updateKBArticle(articleId: string, input: UpdateKBArticleInput) {
  const existing = await prisma.knowledgeBaseArticle.findUnique({ where: { id: articleId } })
  if (!existing) throw new Error('Article not found')

  return prisma.knowledgeBaseArticle.update({
    where: { id: articleId },
    data: input,
  })
}

export async function deleteKBArticle(articleId: string) {
  await prisma.knowledgeBaseArticle.delete({ where: { id: articleId } })
}
