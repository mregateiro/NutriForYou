import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildCampaign, buildEmailTemplate, buildContactSegment } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createCampaign
// ---------------------------------------------------------------------------
describe('createCampaign', () => {
  it('creates campaign with DRAFT status when no scheduledAt', async () => {
    const input = {
      name: 'Test Campaign',
      type: 'EMAIL',
      subject: 'Subject',
      content: 'Content',
    }
    const campaign = buildCampaign({ authorId: 'author-1', ...input, status: 'DRAFT' })
    prisma.campaign.create.mockResolvedValue(campaign)

    const { createCampaign } = await import('@/services/marketing.service')
    const result = await createCampaign('author-1', input as never)

    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorId: 'author-1',
        name: 'Test Campaign',
        status: 'DRAFT',
        scheduledAt: undefined,
      }),
      include: {
        author: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        segment: { select: { id: true, name: true } },
      },
    })
    expect(result).toEqual(campaign)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'author-1',
      action: 'CREATE',
      entity: 'Campaign',
      entityId: campaign.id,
      details: { name: campaign.name, type: campaign.type },
    })
  })

  it('creates campaign with SCHEDULED status when scheduledAt provided', async () => {
    const input = {
      name: 'Scheduled Campaign',
      type: 'EMAIL',
      subject: 'Subject',
      content: 'Content',
      scheduledAt: '2025-12-31T10:00:00Z',
    }
    const campaign = buildCampaign({ authorId: 'author-1', ...input, status: 'SCHEDULED' })
    prisma.campaign.create.mockResolvedValue(campaign)

    const { createCampaign } = await import('@/services/marketing.service')
    await createCampaign('author-1', input as never)

    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'SCHEDULED',
        scheduledAt: expect.any(Date),
      }),
      include: expect.any(Object),
    })
  })
})

// ---------------------------------------------------------------------------
// listCampaigns
// ---------------------------------------------------------------------------
describe('listCampaigns', () => {
  it('returns paginated campaigns with default params', async () => {
    const campaigns = [buildCampaign(), buildCampaign()]
    prisma.campaign.findMany.mockResolvedValue(campaigns)
    prisma.campaign.count.mockResolvedValue(2)

    const { listCampaigns } = await import('@/services/marketing.service')
    const result = await listCampaigns({})

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } })
    )
    expect(result.data).toEqual(campaigns)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })

  it('filters by status', async () => {
    prisma.campaign.findMany.mockResolvedValue([])
    prisma.campaign.count.mockResolvedValue(0)

    const { listCampaigns } = await import('@/services/marketing.service')
    await listCampaigns({ status: 'DRAFT' })

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'DRAFT' } })
    )
  })

  it('filters by type', async () => {
    prisma.campaign.findMany.mockResolvedValue([])
    prisma.campaign.count.mockResolvedValue(0)

    const { listCampaigns } = await import('@/services/marketing.service')
    await listCampaigns({ type: 'EMAIL' })

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'EMAIL' } })
    )
  })
})

// ---------------------------------------------------------------------------
// getCampaign
// ---------------------------------------------------------------------------
describe('getCampaign', () => {
  it('returns campaign by id', async () => {
    const campaign = buildCampaign({ id: 'camp-1' })
    prisma.campaign.findUnique.mockResolvedValue(campaign)

    const { getCampaign } = await import('@/services/marketing.service')
    const result = await getCampaign('camp-1')

    expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      include: {
        author: { select: { id: true, name: true } },
        template: true,
        segment: true,
      },
    })
    expect(result).toEqual(campaign)
  })

  it('throws when campaign not found', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null)

    const { getCampaign } = await import('@/services/marketing.service')
    await expect(getCampaign('non-existent')).rejects.toThrow('Campaign not found')
  })
})

// ---------------------------------------------------------------------------
// updateCampaign
// ---------------------------------------------------------------------------
describe('updateCampaign', () => {
  it('updates campaign and creates audit log', async () => {
    const existing = buildCampaign({ id: 'camp-1' })
    const input = { name: 'Updated Campaign' }
    const updated = { ...existing, name: 'Updated Campaign' }

    prisma.campaign.findUnique.mockResolvedValue(existing)
    prisma.campaign.update.mockResolvedValue(updated)

    const { updateCampaign } = await import('@/services/marketing.service')
    const result = await updateCampaign('camp-1', 'user-1', input as never)

    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      data: expect.objectContaining({ name: 'Updated Campaign' }),
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'Campaign',
      entityId: 'camp-1',
      details: { updatedFields: ['name'] },
    })
  })

  it('throws when campaign not found', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null)

    const { updateCampaign } = await import('@/services/marketing.service')
    await expect(updateCampaign('bad-id', 'user-1', { name: 'X' } as never)).rejects.toThrow(
      'Campaign not found'
    )

    expect(prisma.campaign.update).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// deleteCampaign
// ---------------------------------------------------------------------------
describe('deleteCampaign', () => {
  it('deletes campaign with audit log', async () => {
    prisma.campaign.delete.mockResolvedValue({})

    const { deleteCampaign } = await import('@/services/marketing.service')
    await deleteCampaign('camp-1', 'user-1')

    expect(prisma.campaign.delete).toHaveBeenCalledWith({ where: { id: 'camp-1' } })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'DELETE',
      entity: 'Campaign',
      entityId: 'camp-1',
    })
  })
})

// ---------------------------------------------------------------------------
// createEmailTemplate
// ---------------------------------------------------------------------------
describe('createEmailTemplate', () => {
  it('creates email template', async () => {
    const input = {
      name: 'Welcome Email',
      subject: 'Welcome!',
      htmlContent: '<h1>Welcome</h1>',
      textContent: 'Welcome',
    }
    const template = buildEmailTemplate({ authorId: 'author-1', ...input })
    prisma.emailTemplate.create.mockResolvedValue(template)

    const { createEmailTemplate } = await import('@/services/marketing.service')
    const result = await createEmailTemplate('author-1', input as never)

    expect(prisma.emailTemplate.create).toHaveBeenCalledWith({
      data: { authorId: 'author-1', ...input },
    })
    expect(result).toEqual(template)
  })
})

// ---------------------------------------------------------------------------
// listEmailTemplates
// ---------------------------------------------------------------------------
describe('listEmailTemplates', () => {
  it('returns all templates when no authorId', async () => {
    const templates = [buildEmailTemplate(), buildEmailTemplate()]
    prisma.emailTemplate.findMany.mockResolvedValue(templates)

    const { listEmailTemplates } = await import('@/services/marketing.service')
    const result = await listEmailTemplates()

    expect(prisma.emailTemplate.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { updatedAt: 'desc' },
    })
    expect(result).toEqual(templates)
  })

  it('filters by authorId', async () => {
    prisma.emailTemplate.findMany.mockResolvedValue([])

    const { listEmailTemplates } = await import('@/services/marketing.service')
    await listEmailTemplates('author-1')

    expect(prisma.emailTemplate.findMany).toHaveBeenCalledWith({
      where: { authorId: 'author-1' },
      orderBy: { updatedAt: 'desc' },
    })
  })
})

// ---------------------------------------------------------------------------
// updateEmailTemplate
// ---------------------------------------------------------------------------
describe('updateEmailTemplate', () => {
  it('updates template', async () => {
    const existing = buildEmailTemplate({ id: 'tpl-1' })
    const input = { name: 'Updated Template' }
    const updated = { ...existing, name: 'Updated Template' }

    prisma.emailTemplate.findUnique.mockResolvedValue(existing)
    prisma.emailTemplate.update.mockResolvedValue(updated)

    const { updateEmailTemplate } = await import('@/services/marketing.service')
    const result = await updateEmailTemplate('tpl-1', input as never)

    expect(prisma.emailTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tpl-1' },
      data: input,
    })
    expect(result).toEqual(updated)
  })

  it('throws when template not found', async () => {
    prisma.emailTemplate.findUnique.mockResolvedValue(null)

    const { updateEmailTemplate } = await import('@/services/marketing.service')
    await expect(updateEmailTemplate('bad-id', { name: 'X' } as never)).rejects.toThrow(
      'Template not found'
    )
  })
})

// ---------------------------------------------------------------------------
// deleteEmailTemplate
// ---------------------------------------------------------------------------
describe('deleteEmailTemplate', () => {
  it('deletes template', async () => {
    prisma.emailTemplate.delete.mockResolvedValue({})

    const { deleteEmailTemplate } = await import('@/services/marketing.service')
    await deleteEmailTemplate('tpl-1')

    expect(prisma.emailTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tpl-1' } })
  })
})

// ---------------------------------------------------------------------------
// createContactSegment
// ---------------------------------------------------------------------------
describe('createContactSegment', () => {
  it('creates segment with user count', async () => {
    const input = {
      name: 'Active Nutritionists',
      filters: { roles: ['NUTRITIONIST'], hasActiveSubscription: true },
    }
    const segment = buildContactSegment({ authorId: 'author-1', ...input, count: 5 })

    prisma.user.count.mockResolvedValue(5)
    prisma.contactSegment.create.mockResolvedValue(segment)

    const { createContactSegment } = await import('@/services/marketing.service')
    const result = await createContactSegment('author-1', input as never)

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        role: { in: ['NUTRITIONIST'] },
        subscription: { status: 'ACTIVE' },
      }),
    })
    expect(prisma.contactSegment.create).toHaveBeenCalledWith({
      data: {
        authorId: 'author-1',
        name: 'Active Nutritionists',
        filters: expect.any(Object),
        count: 5,
      },
    })
    expect(result).toEqual(segment)
  })

  it('creates segment without role/subscription filters', async () => {
    const input = {
      name: 'All Users',
      filters: {},
    }
    const segment = buildContactSegment({ authorId: 'author-1', ...input, count: 10 })

    prisma.user.count.mockResolvedValue(10)
    prisma.contactSegment.create.mockResolvedValue(segment)

    const { createContactSegment } = await import('@/services/marketing.service')
    await createContactSegment('author-1', input as never)

    expect(prisma.user.count).toHaveBeenCalledWith({ where: {} })
  })
})

// ---------------------------------------------------------------------------
// listContactSegments
// ---------------------------------------------------------------------------
describe('listContactSegments', () => {
  it('returns all segments when no authorId', async () => {
    const segments = [buildContactSegment(), buildContactSegment()]
    prisma.contactSegment.findMany.mockResolvedValue(segments)

    const { listContactSegments } = await import('@/services/marketing.service')
    const result = await listContactSegments()

    expect(prisma.contactSegment.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { updatedAt: 'desc' },
    })
    expect(result).toEqual(segments)
  })

  it('filters by authorId', async () => {
    prisma.contactSegment.findMany.mockResolvedValue([])

    const { listContactSegments } = await import('@/services/marketing.service')
    await listContactSegments('author-1')

    expect(prisma.contactSegment.findMany).toHaveBeenCalledWith({
      where: { authorId: 'author-1' },
      orderBy: { updatedAt: 'desc' },
    })
  })
})

// ---------------------------------------------------------------------------
// updateContactSegment
// ---------------------------------------------------------------------------
describe('updateContactSegment', () => {
  it('updates segment', async () => {
    const existing = buildContactSegment({ id: 'seg-1' })
    const input = { name: 'Updated Segment' }
    const updated = { ...existing, name: 'Updated Segment' }

    prisma.contactSegment.findUnique.mockResolvedValue(existing)
    prisma.contactSegment.update.mockResolvedValue(updated)

    const { updateContactSegment } = await import('@/services/marketing.service')
    const result = await updateContactSegment('seg-1', input as never)

    expect(prisma.contactSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg-1' },
      data: { name: 'Updated Segment' },
    })
    expect(result).toEqual(updated)
  })

  it('updates segment filters', async () => {
    const existing = buildContactSegment({ id: 'seg-1' })
    const input = { filters: { roles: ['ADMIN'] } }
    const updated = { ...existing, filters: { roles: ['ADMIN'] } }

    prisma.contactSegment.findUnique.mockResolvedValue(existing)
    prisma.contactSegment.update.mockResolvedValue(updated)

    const { updateContactSegment } = await import('@/services/marketing.service')
    await updateContactSegment('seg-1', input as never)

    expect(prisma.contactSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg-1' },
      data: { filters: expect.any(Object) },
    })
  })

  it('throws when segment not found', async () => {
    prisma.contactSegment.findUnique.mockResolvedValue(null)

    const { updateContactSegment } = await import('@/services/marketing.service')
    await expect(updateContactSegment('bad-id', { name: 'X' } as never)).rejects.toThrow(
      'Segment not found'
    )
  })
})

// ---------------------------------------------------------------------------
// deleteContactSegment
// ---------------------------------------------------------------------------
describe('deleteContactSegment', () => {
  it('deletes segment', async () => {
    prisma.contactSegment.delete.mockResolvedValue({})

    const { deleteContactSegment } = await import('@/services/marketing.service')
    await deleteContactSegment('seg-1')

    expect(prisma.contactSegment.delete).toHaveBeenCalledWith({ where: { id: 'seg-1' } })
  })
})
