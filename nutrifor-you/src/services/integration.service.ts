import { AuditAction, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { ConnectIntegrationInput, UpdateIntegrationInput } from '@/validators/integration.schema'

export async function connectIntegration(userId: string, input: ConnectIntegrationInput) {
  const integration = await prisma.integration.upsert({
    where: { userId_provider: { userId, provider: input.provider } },
    create: {
      userId,
      provider: input.provider,
      status: 'CONNECTED',
      config: (input.config ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    update: {
      status: 'CONNECTED',
      config: (input.config ?? undefined) as Prisma.InputJsonValue | undefined,
      lastSyncAt: new Date(),
    },
  })

  await createAuditLog({
    userId,
    action: AuditAction.CREATE,
    entity: 'Integration',
    entityId: integration.id,
    details: { provider: input.provider },
  })

  logger.info({ integrationId: integration.id, provider: input.provider, userId }, 'Integration connected')
  return integration
}

export async function listIntegrations(userId: string) {
  return prisma.integration.findMany({
    where: { userId },
    orderBy: { provider: 'asc' },
  })
}

export async function getIntegration(userId: string, provider: string) {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: provider as never },
    include: {
      webhookLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!integration) throw new Error('Integration not found')
  return integration
}

export async function updateIntegration(userId: string, integrationId: string, input: UpdateIntegrationInput) {
  const existing = await prisma.integration.findFirst({
    where: { id: integrationId, userId },
  })
  if (!existing) throw new Error('Integration not found')

  const integration = await prisma.integration.update({
    where: { id: integrationId },
    data: {
      config: (input.config ?? undefined) as Prisma.InputJsonValue | undefined,
      status: input.status ?? undefined,
    },
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Integration',
    entityId: integrationId,
    details: { updatedFields: Object.keys(input) },
  })

  return integration
}

export async function disconnectIntegration(userId: string, integrationId: string) {
  const existing = await prisma.integration.findFirst({
    where: { id: integrationId, userId },
  })
  if (!existing) throw new Error('Integration not found')

  await prisma.integration.update({
    where: { id: integrationId },
    data: { status: 'DISCONNECTED' },
  })

  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    entity: 'Integration',
    entityId: integrationId,
    details: { provider: existing.provider },
  })

  logger.info({ integrationId, provider: existing.provider, userId }, 'Integration disconnected')
}

export async function logWebhookEvent(integrationId: string, event: string, payload: unknown, response: unknown, statusCode: number, success: boolean) {
  await prisma.webhookLog.create({
    data: {
      integrationId,
      event,
      payload: payload as never,
      response: response as never,
      statusCode,
      success,
    },
  })
}

export async function getWebhookLogs(integrationId: string, params: { page?: number; perPage?: number }) {
  const { page = 1, perPage = 20 } = params

  const [logs, total] = await Promise.all([
    prisma.webhookLog.findMany({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.webhookLog.count({ where: { integrationId } }),
  ])

  return {
    data: logs,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}
