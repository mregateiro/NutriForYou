import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildSupportTicket, buildTicketReply, buildKBArticle, buildUser } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createTicket
// ---------------------------------------------------------------------------
describe('createTicket', () => {
  it('creates ticket with audit log', async () => {
    const ticket = buildSupportTicket({ userId: 'user-1' })
    prisma.supportTicket.create.mockResolvedValue(ticket)

    const { createTicket } = await import('@/services/support.service')
    const input = { subject: 'Help', description: 'Need help', category: 'GENERAL' }
    const result = await createTicket('user-1', input as never)

    expect(result).toEqual(ticket)
    expect(prisma.supportTicket.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', ...input },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'CREATE',
      entity: 'SupportTicket',
      entityId: ticket.id,
      details: { subject: ticket.subject },
    })
  })
})

// ---------------------------------------------------------------------------
// getTicket
// ---------------------------------------------------------------------------
describe('getTicket', () => {
  it('returns ticket for owner', async () => {
    const ticket = buildSupportTicket({ userId: 'user-1' })
    prisma.supportTicket.findFirst.mockResolvedValue(ticket)

    const { getTicket } = await import('@/services/support.service')
    const result = await getTicket(ticket.id, 'user-1')

    expect(result).toEqual(ticket)
  })

  it('returns ticket for admin user', async () => {
    const ticket = buildSupportTicket({ userId: 'other-user' })
    prisma.supportTicket.findFirst.mockResolvedValue(ticket)
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' })

    const { getTicket } = await import('@/services/support.service')
    const result = await getTicket(ticket.id, 'admin-user')

    expect(result).toEqual(ticket)
  })

  it('throws when non-admin non-owner accesses', async () => {
    const ticket = buildSupportTicket({ userId: 'other-user' })
    prisma.supportTicket.findFirst.mockResolvedValue(ticket)
    prisma.user.findUnique.mockResolvedValue({ role: 'NUTRITIONIST' })

    const { getTicket } = await import('@/services/support.service')

    await expect(getTicket(ticket.id, 'user-1')).rejects.toThrow('Ticket not found')
  })

  it('throws when ticket not found', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue(null)

    const { getTicket } = await import('@/services/support.service')

    await expect(getTicket('nonexistent', 'user-1')).rejects.toThrow('Ticket not found')
  })
})

// ---------------------------------------------------------------------------
// listTickets
// ---------------------------------------------------------------------------
describe('listTickets', () => {
  it('returns paginated tickets for user', async () => {
    const tickets = [buildSupportTicket(), buildSupportTicket()]
    prisma.supportTicket.findMany.mockResolvedValue(tickets)
    prisma.supportTicket.count.mockResolvedValue(2)

    const { listTickets } = await import('@/services/support.service')
    const result = await listTickets('user-1', {})

    expect(result).toEqual({
      data: tickets,
      pagination: { page: 1, perPage: 20, total: 2, totalPages: 1 },
    })
    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        skip: 0,
        take: 20,
      }),
    )
  })

  it('returns all tickets when isAdmin', async () => {
    prisma.supportTicket.findMany.mockResolvedValue([])
    prisma.supportTicket.count.mockResolvedValue(0)

    const { listTickets } = await import('@/services/support.service')
    await listTickets('admin-1', { isAdmin: true })

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    )
  })

  it('applies status filter', async () => {
    prisma.supportTicket.findMany.mockResolvedValue([])
    prisma.supportTicket.count.mockResolvedValue(0)

    const { listTickets } = await import('@/services/support.service')
    await listTickets('user-1', { status: 'OPEN' })

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', status: 'OPEN' },
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// updateTicket
// ---------------------------------------------------------------------------
describe('updateTicket', () => {
  it('updates ticket fields', async () => {
    const existing = buildSupportTicket({ id: 't-1' })
    const updated = { ...existing, priority: 'HIGH' }
    prisma.supportTicket.findUnique.mockResolvedValue(existing)
    prisma.supportTicket.update.mockResolvedValue(updated)

    const { updateTicket } = await import('@/services/support.service')
    const result = await updateTicket('t-1', 'user-1', { priority: 'HIGH' } as never)

    expect(result).toEqual(updated)
    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't-1' },
        data: expect.objectContaining({ priority: 'HIGH' }),
      }),
    )

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'SupportTicket',
      entityId: 't-1',
      details: { updatedFields: ['priority'] },
    })
  })

  it('sets resolvedAt when status is RESOLVED', async () => {
    const existing = buildSupportTicket({ id: 't-1' })
    prisma.supportTicket.findUnique.mockResolvedValue(existing)
    prisma.supportTicket.update.mockResolvedValue({ ...existing, status: 'RESOLVED' })

    const { updateTicket } = await import('@/services/support.service')
    await updateTicket('t-1', 'user-1', { status: 'RESOLVED' } as never)

    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
        }),
      }),
    )
  })

  it('sets closedAt when status is CLOSED', async () => {
    const existing = buildSupportTicket({ id: 't-1' })
    prisma.supportTicket.findUnique.mockResolvedValue(existing)
    prisma.supportTicket.update.mockResolvedValue({ ...existing, status: 'CLOSED' })

    const { updateTicket } = await import('@/services/support.service')
    await updateTicket('t-1', 'user-1', { status: 'CLOSED' } as never)

    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CLOSED',
          closedAt: expect.any(Date),
        }),
      }),
    )
  })

  it('throws when ticket not found', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(null)

    const { updateTicket } = await import('@/services/support.service')

    await expect(
      updateTicket('nonexistent', 'user-1', { priority: 'HIGH' } as never),
    ).rejects.toThrow('Ticket not found')
  })
})

// ---------------------------------------------------------------------------
// replyToTicket
// ---------------------------------------------------------------------------
describe('replyToTicket', () => {
  it('creates reply with isStaff=false for non-admin', async () => {
    const ticket = buildSupportTicket({ id: 't-1', status: 'OPEN' })
    const reply = buildTicketReply({ ticketId: 't-1', isStaff: false })
    prisma.supportTicket.findUnique.mockResolvedValue(ticket)
    prisma.user.findUnique.mockResolvedValue({ role: 'NUTRITIONIST' })
    prisma.ticketReply.create.mockResolvedValue(reply)

    const { replyToTicket } = await import('@/services/support.service')
    const result = await replyToTicket('t-1', 'user-1', { message: 'Hello' } as never)

    expect(result).toEqual(reply)
    expect(prisma.ticketReply.create).toHaveBeenCalledWith({
      data: {
        ticketId: 't-1',
        userId: 'user-1',
        message: 'Hello',
        isStaff: false,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    expect(prisma.supportTicket.update).not.toHaveBeenCalled()
  })

  it('creates reply with isStaff=true for admin and updates ticket status to IN_PROGRESS', async () => {
    const ticket = buildSupportTicket({ id: 't-1', status: 'OPEN' })
    const reply = buildTicketReply({ ticketId: 't-1', isStaff: true })
    prisma.supportTicket.findUnique.mockResolvedValue(ticket)
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' })
    prisma.ticketReply.create.mockResolvedValue(reply)
    prisma.supportTicket.update.mockResolvedValue({ ...ticket, status: 'IN_PROGRESS' })

    const { replyToTicket } = await import('@/services/support.service')
    const result = await replyToTicket('t-1', 'admin-1', { message: 'We are on it' } as never)

    expect(result).toEqual(reply)
    expect(prisma.ticketReply.create).toHaveBeenCalledWith({
      data: {
        ticketId: 't-1',
        userId: 'admin-1',
        message: 'We are on it',
        isStaff: true,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 't-1' },
      data: { status: 'IN_PROGRESS' },
    })
  })

  it('throws when ticket not found', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(null)

    const { replyToTicket } = await import('@/services/support.service')

    await expect(
      replyToTicket('nonexistent', 'user-1', { message: 'Hello' } as never),
    ).rejects.toThrow('Ticket not found')
  })
})

// ---------------------------------------------------------------------------
// createKBArticle
// ---------------------------------------------------------------------------
describe('createKBArticle', () => {
  it('creates KB article', async () => {
    const article = buildKBArticle({ authorId: 'author-1' })
    prisma.knowledgeBaseArticle.create.mockResolvedValue(article)

    const { createKBArticle } = await import('@/services/support.service')
    const input = { title: 'How to', slug: 'how-to', content: 'Steps...', category: 'GETTING_STARTED' }
    const result = await createKBArticle('author-1', input as never)

    expect(result).toEqual(article)
    expect(prisma.knowledgeBaseArticle.create).toHaveBeenCalledWith({
      data: { authorId: 'author-1', ...input },
    })
  })
})

// ---------------------------------------------------------------------------
// listKBArticles
// ---------------------------------------------------------------------------
describe('listKBArticles', () => {
  it('returns paginated articles', async () => {
    const articles = [buildKBArticle(), buildKBArticle()]
    prisma.knowledgeBaseArticle.findMany.mockResolvedValue(articles)
    prisma.knowledgeBaseArticle.count.mockResolvedValue(2)

    const { listKBArticles } = await import('@/services/support.service')
    const result = await listKBArticles({})

    expect(result).toEqual({
      data: articles,
      pagination: { page: 1, perPage: 20, total: 2, totalPages: 1 },
    })
  })

  it('applies category filter', async () => {
    prisma.knowledgeBaseArticle.findMany.mockResolvedValue([])
    prisma.knowledgeBaseArticle.count.mockResolvedValue(0)

    const { listKBArticles } = await import('@/services/support.service')
    await listKBArticles({ category: 'GETTING_STARTED' })

    expect(prisma.knowledgeBaseArticle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: 'GETTING_STARTED' },
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// getKBArticle
// ---------------------------------------------------------------------------
describe('getKBArticle', () => {
  it('returns article and increments viewCount', async () => {
    const article = buildKBArticle({ slug: 'my-article', viewCount: 5 })
    prisma.knowledgeBaseArticle.findUnique.mockResolvedValue(article)
    prisma.knowledgeBaseArticle.update.mockResolvedValue({ ...article, viewCount: 6 })

    const { getKBArticle } = await import('@/services/support.service')
    const result = await getKBArticle('my-article')

    expect(result).toEqual(article)
    expect(prisma.knowledgeBaseArticle.findUnique).toHaveBeenCalledWith({
      where: { slug: 'my-article' },
      include: { author: { select: { id: true, name: true } } },
    })
    expect(prisma.knowledgeBaseArticle.update).toHaveBeenCalledWith({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    })
  })

  it('throws when article not found', async () => {
    prisma.knowledgeBaseArticle.findUnique.mockResolvedValue(null)

    const { getKBArticle } = await import('@/services/support.service')

    await expect(getKBArticle('nonexistent')).rejects.toThrow('Article not found')
  })
})

// ---------------------------------------------------------------------------
// updateKBArticle
// ---------------------------------------------------------------------------
describe('updateKBArticle', () => {
  it('updates article successfully', async () => {
    const existing = buildKBArticle({ id: 'a-1' })
    const updated = { ...existing, title: 'Updated Title' }
    prisma.knowledgeBaseArticle.findUnique.mockResolvedValue(existing)
    prisma.knowledgeBaseArticle.update.mockResolvedValue(updated)

    const { updateKBArticle } = await import('@/services/support.service')
    const result = await updateKBArticle('a-1', { title: 'Updated Title' } as never)

    expect(result).toEqual(updated)
    expect(prisma.knowledgeBaseArticle.update).toHaveBeenCalledWith({
      where: { id: 'a-1' },
      data: { title: 'Updated Title' },
    })
  })

  it('throws when article not found', async () => {
    prisma.knowledgeBaseArticle.findUnique.mockResolvedValue(null)

    const { updateKBArticle } = await import('@/services/support.service')

    await expect(
      updateKBArticle('nonexistent', { title: 'Updated' } as never),
    ).rejects.toThrow('Article not found')
  })
})

// ---------------------------------------------------------------------------
// deleteKBArticle
// ---------------------------------------------------------------------------
describe('deleteKBArticle', () => {
  it('deletes article', async () => {
    prisma.knowledgeBaseArticle.delete.mockResolvedValue({})

    const { deleteKBArticle } = await import('@/services/support.service')
    await deleteKBArticle('a-1')

    expect(prisma.knowledgeBaseArticle.delete).toHaveBeenCalledWith({
      where: { id: 'a-1' },
    })
  })
})
