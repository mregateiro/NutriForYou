import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildAuditLog } from '../../helpers/test-data-builders'

vi.unmock('@/services/audit.service')

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

describe('createAuditLog', () => {
  it('creates audit log entry', async () => {
    const log = buildAuditLog()
    prisma.auditLog.create.mockResolvedValue(log)

    const { createAuditLog } = await import('@/services/audit.service')
    await createAuditLog({
      userId: 'user-1',
      action: 'CREATE' as never,
      entity: 'User',
      entityId: 'entity-1',
      details: { foo: 'bar' },
    })

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'CREATE',
        entity: 'User',
        entityId: 'entity-1',
        details: { foo: 'bar' },
        ipAddress: undefined,
        userAgent: undefined,
      },
    })
  })

  it('handles errors gracefully and does not throw', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('DB error'))

    const { createAuditLog } = await import('@/services/audit.service')

    await expect(
      createAuditLog({
        userId: 'user-1',
        action: 'CREATE' as never,
        entity: 'User',
      })
    ).resolves.toBeUndefined()
  })
})

describe('getAuditLogs', () => {
  it('returns paginated logs with defaults', async () => {
    const logs = [buildAuditLog(), buildAuditLog()]
    prisma.auditLog.findMany.mockResolvedValue(logs)
    prisma.auditLog.count.mockResolvedValue(2)

    const { getAuditLogs } = await import('@/services/audit.service')
    const result = await getAuditLogs({})

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      })
    )
    expect(prisma.auditLog.count).toHaveBeenCalledWith({ where: {} })
    expect(result.data).toEqual(logs)
    expect(result.pagination).toEqual({ page: 1, perPage: 50, total: 2, totalPages: 1 })
  })

  it('filters by userId', async () => {
    prisma.auditLog.findMany.mockResolvedValue([])
    prisma.auditLog.count.mockResolvedValue(0)

    const { getAuditLogs } = await import('@/services/audit.service')
    await getAuditLogs({ userId: 'user-1' })

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    )
  })

  it('filters by entity', async () => {
    prisma.auditLog.findMany.mockResolvedValue([])
    prisma.auditLog.count.mockResolvedValue(0)

    const { getAuditLogs } = await import('@/services/audit.service')
    await getAuditLogs({ entity: 'User' })

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entity: 'User' } })
    )
  })

  it('filters by action', async () => {
    prisma.auditLog.findMany.mockResolvedValue([])
    prisma.auditLog.count.mockResolvedValue(0)

    const { getAuditLogs } = await import('@/services/audit.service')
    await getAuditLogs({ action: 'DELETE' as never })

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { action: 'DELETE' } })
    )
  })
})
