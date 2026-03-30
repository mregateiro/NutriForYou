import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// connectIntegration
// ---------------------------------------------------------------------------
describe('connectIntegration', () => {
  it('upserts integration with CONNECTED status', async () => {
    const mockIntegration = {
      id: 'int-1',
      userId: 'user-1',
      provider: 'STRIPE',
      status: 'CONNECTED',
      config: null,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    prisma.integration.upsert.mockResolvedValue(mockIntegration)

    const { connectIntegration } = await import('@/services/integration.service')
    const result = await connectIntegration('user-1', { provider: 'STRIPE' as never })

    expect(result).toEqual(mockIntegration)
    expect(prisma.integration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_provider: { userId: 'user-1', provider: 'STRIPE' } },
        create: expect.objectContaining({ status: 'CONNECTED', provider: 'STRIPE' }),
        update: expect.objectContaining({ status: 'CONNECTED' }),
      }),
    )
  })

  it('creates audit log after connecting', async () => {
    const mockIntegration = {
      id: 'int-2',
      userId: 'user-1',
      provider: 'ZOOM',
      status: 'CONNECTED',
    }
    prisma.integration.upsert.mockResolvedValue(mockIntegration)

    const { connectIntegration } = await import('@/services/integration.service')
    await connectIntegration('user-1', { provider: 'ZOOM' as never })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        entity: 'Integration',
        entityId: 'int-2',
        details: { provider: 'ZOOM' },
      }),
    )
  })

  it('re-connects a previously disconnected integration', async () => {
    const mockIntegration = {
      id: 'int-3',
      userId: 'user-1',
      provider: 'WHATSAPP',
      status: 'CONNECTED',
      lastSyncAt: new Date(),
    }
    prisma.integration.upsert.mockResolvedValue(mockIntegration)

    const { connectIntegration } = await import('@/services/integration.service')
    const result = await connectIntegration('user-1', { provider: 'WHATSAPP' as never })

    expect(result.status).toBe('CONNECTED')
  })
})

// ---------------------------------------------------------------------------
// disconnectIntegration
// ---------------------------------------------------------------------------
describe('disconnectIntegration', () => {
  it('sets status to DISCONNECTED (not deleted)', async () => {
    const existing = {
      id: 'int-1',
      userId: 'user-1',
      provider: 'STRIPE',
      status: 'CONNECTED',
    }
    prisma.integration.findFirst.mockResolvedValue(existing)
    prisma.integration.update.mockResolvedValue({ ...existing, status: 'DISCONNECTED' })

    const { disconnectIntegration } = await import('@/services/integration.service')
    await disconnectIntegration('user-1', 'int-1')

    expect(prisma.integration.update).toHaveBeenCalledWith({
      where: { id: 'int-1' },
      data: { status: 'DISCONNECTED' },
    })
  })

  it('throws when integration not found', async () => {
    prisma.integration.findFirst.mockResolvedValue(null)

    const { disconnectIntegration } = await import('@/services/integration.service')
    await expect(disconnectIntegration('user-1', 'nonexistent')).rejects.toThrow('Integration not found')
  })

  it('creates audit log after disconnecting', async () => {
    const existing = {
      id: 'int-1',
      userId: 'user-1',
      provider: 'GOOGLE_CALENDAR',
      status: 'CONNECTED',
    }
    prisma.integration.findFirst.mockResolvedValue(existing)
    prisma.integration.update.mockResolvedValue({ ...existing, status: 'DISCONNECTED' })

    const { disconnectIntegration } = await import('@/services/integration.service')
    await disconnectIntegration('user-1', 'int-1')

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        entity: 'Integration',
        entityId: 'int-1',
        details: { provider: 'GOOGLE_CALENDAR' },
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// listIntegrations
// ---------------------------------------------------------------------------
describe('listIntegrations', () => {
  it('returns all integrations for a user (including DISCONNECTED)', async () => {
    const mockList = [
      { id: 'int-1', provider: 'STRIPE', status: 'CONNECTED' },
      { id: 'int-2', provider: 'WHATSAPP', status: 'DISCONNECTED' },
    ]
    prisma.integration.findMany.mockResolvedValue(mockList)

    const { listIntegrations } = await import('@/services/integration.service')
    const result = await listIntegrations('user-1')

    expect(result).toEqual(mockList)
    expect(prisma.integration.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { provider: 'asc' },
    })
  })

  it('returns empty array when no integrations exist', async () => {
    prisma.integration.findMany.mockResolvedValue([])

    const { listIntegrations } = await import('@/services/integration.service')
    const result = await listIntegrations('user-1')

    expect(result).toEqual([])
  })
})
