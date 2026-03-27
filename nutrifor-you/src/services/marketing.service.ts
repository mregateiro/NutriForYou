import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type {
  CreateCampaignInput, UpdateCampaignInput,
  CreateEmailTemplateInput, UpdateEmailTemplateInput,
  CreateContactSegmentInput, UpdateContactSegmentInput,
} from '@/validators/marketing.schema'

// ─── Campaigns ─────────────────────────────────────────────

export async function createCampaign(authorId: string, input: CreateCampaignInput) {
  const campaign = await prisma.campaign.create({
    data: {
      authorId,
      name: input.name,
      type: input.type,
      subject: input.subject,
      content: input.content,
      templateId: input.templateId,
      segmentId: input.segmentId,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      status: input.scheduledAt ? 'SCHEDULED' : 'DRAFT',
    },
    include: {
      author: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      segment: { select: { id: true, name: true } },
    },
  })

  await createAuditLog({
    userId: authorId,
    action: AuditAction.CREATE,
    entity: 'Campaign',
    entityId: campaign.id,
    details: { name: campaign.name, type: campaign.type },
  })

  logger.info({ campaignId: campaign.id, authorId }, 'Campaign created')
  return campaign
}

export async function listCampaigns(params: {
  status?: string
  type?: string
  page?: number
  perPage?: number
}) {
  const { page = 1, perPage = 20, status, type } = params
  const where: Record<string, unknown> = {}

  if (status) where.status = status
  if (type) where.type = type

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        segment: { select: { id: true, name: true, count: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.campaign.count({ where }),
  ])

  return {
    data: campaigns,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function getCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      author: { select: { id: true, name: true } },
      template: true,
      segment: true,
    },
  })
  if (!campaign) throw new Error('Campaign not found')
  return campaign
}

export async function updateCampaign(campaignId: string, userId: string, input: UpdateCampaignInput) {
  const existing = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!existing) throw new Error('Campaign not found')

  const data: Record<string, unknown> = { ...input }
  if (input.scheduledAt) data.scheduledAt = new Date(input.scheduledAt)

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data,
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Campaign',
    entityId: campaignId,
    details: { updatedFields: Object.keys(input) },
  })

  return campaign
}

export async function deleteCampaign(campaignId: string, userId: string) {
  await prisma.campaign.delete({ where: { id: campaignId } })
  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    entity: 'Campaign',
    entityId: campaignId,
  })
}

// ─── Email Templates ───────────────────────────────────────

export async function createEmailTemplate(authorId: string, input: CreateEmailTemplateInput) {
  return prisma.emailTemplate.create({
    data: { authorId, ...input },
  })
}

export async function listEmailTemplates(authorId?: string) {
  const where = authorId ? { authorId } : {}
  return prisma.emailTemplate.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })
}

export async function updateEmailTemplate(templateId: string, input: UpdateEmailTemplateInput) {
  const existing = await prisma.emailTemplate.findUnique({ where: { id: templateId } })
  if (!existing) throw new Error('Template not found')

  return prisma.emailTemplate.update({ where: { id: templateId }, data: input })
}

export async function deleteEmailTemplate(templateId: string) {
  await prisma.emailTemplate.delete({ where: { id: templateId } })
}

// ─── Contact Segments ──────────────────────────────────────

export async function createContactSegment(authorId: string, input: CreateContactSegmentInput) {
  // Calculate count based on filters
  const filters = input.filters
  const userWhere: Record<string, unknown> = {}
  if (filters.roles && filters.roles.length > 0) userWhere.role = { in: filters.roles }
  if (filters.hasActiveSubscription) {
    userWhere.subscription = { status: 'ACTIVE' }
  }

  const count = await prisma.user.count({ where: userWhere })

  return prisma.contactSegment.create({
    data: {
      authorId,
      name: input.name,
      filters: JSON.parse(JSON.stringify(input.filters)),
      count,
    },
  })
}

export async function listContactSegments(authorId?: string) {
  const where = authorId ? { authorId } : {}
  return prisma.contactSegment.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })
}

export async function updateContactSegment(segmentId: string, input: UpdateContactSegmentInput) {
  const existing = await prisma.contactSegment.findUnique({ where: { id: segmentId } })
  if (!existing) throw new Error('Segment not found')

  const data: Record<string, unknown> = {}
  if (input.name) data.name = input.name
  if (input.filters) data.filters = JSON.parse(JSON.stringify(input.filters))

  return prisma.contactSegment.update({ where: { id: segmentId }, data })
}

export async function deleteContactSegment(segmentId: string) {
  await prisma.contactSegment.delete({ where: { id: segmentId } })
}
