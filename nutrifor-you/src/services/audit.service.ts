import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface AuditLogInput {
  userId?: string
  action: AuditAction
  entity: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })
  } catch (error) {
    logger.error({ error, input }, 'Failed to create audit log')
  }
}

export async function getAuditLogs(params: {
  userId?: string
  entity?: string
  entityId?: string
  action?: AuditAction
  page?: number
  perPage?: number
}) {
  const { page = 1, perPage = 50, ...filters } = params
  const where: Record<string, unknown> = {}

  if (filters.userId) where.userId = filters.userId
  if (filters.entity) where.entity = filters.entity
  if (filters.entityId) where.entityId = filters.entityId
  if (filters.action) where.action = filters.action

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    data: logs,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}
