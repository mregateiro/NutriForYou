import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildUser } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

describe('updateUserRole', () => {
  it('updates role and creates audit log', async () => {
    const user = buildUser({ role: 'NUTRITIONIST' })
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.user.update.mockResolvedValue({ ...user, role: 'ADMIN' })

    const { updateUserRole } = await import('@/services/auth.service')
    await updateUserRole(user.id, 'ADMIN', 'performer-1')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: user.id } })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'performer-1',
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      details: { field: 'role', oldValue: 'NUTRITIONIST', newValue: 'ADMIN' },
    })
  })

  it('throws error when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const { updateUserRole } = await import('@/services/auth.service')
    await expect(updateUserRole('non-existent', 'ADMIN', 'performer-1')).rejects.toThrow(
      'User not found'
    )

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('updateSubscriptionTier', () => {
  it('updates subscription tier and creates audit log', async () => {
    const user = buildUser({ subscriptionTier: 'PREMIUM' })
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.user.update.mockResolvedValue({ ...user, subscriptionTier: 'BUSINESS' })

    const { updateSubscriptionTier } = await import('@/services/auth.service')
    await updateSubscriptionTier(user.id, 'BUSINESS', 'performer-2')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: user.id } })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { subscriptionTier: 'BUSINESS' },
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'performer-2',
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      details: { field: 'subscriptionTier', oldValue: 'PREMIUM', newValue: 'BUSINESS' },
    })
  })

  it('throws error when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const { updateSubscriptionTier } = await import('@/services/auth.service')
    await expect(
      updateSubscriptionTier('non-existent', 'BUSINESS', 'performer-2')
    ).rejects.toThrow('User not found')

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('deactivateUser', () => {
  it('deactivates user and creates audit log', async () => {
    prisma.user.update.mockResolvedValue({ id: 'user-1', isActive: false })

    const { deactivateUser } = await import('@/services/auth.service')
    await deactivateUser('user-1', 'performer-3')

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isActive: false },
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'performer-3',
      action: 'UPDATE',
      entity: 'User',
      entityId: 'user-1',
      details: { field: 'isActive', newValue: false },
    })
  })
})

describe('getUsers', () => {
  it('returns users with default pagination', async () => {
    const users = [buildUser(), buildUser()]
    prisma.user.findMany.mockResolvedValue(users)
    prisma.user.count.mockResolvedValue(2)

    const { getUsers } = await import('@/services/auth.service')
    const result = await getUsers({})

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    )
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { isActive: true } })
    expect(result.data).toEqual(users)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })

  it('filters by role', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)

    const { getUsers } = await import('@/services/auth.service')
    await getUsers({ role: 'ADMIN' })

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, role: 'ADMIN' },
      })
    )
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { isActive: true, role: 'ADMIN' },
    })
  })

  it('filters by organizationId', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)

    const { getUsers } = await import('@/services/auth.service')
    await getUsers({ organizationId: 'org-1' })

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, organizationId: 'org-1' },
      })
    )
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { isActive: true, organizationId: 'org-1' },
    })
  })

  it('calculates totalPages correctly', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(45)

    const { getUsers } = await import('@/services/auth.service')
    const result = await getUsers({ page: 1, perPage: 20 })

    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 45, totalPages: 3 })
  })
})
