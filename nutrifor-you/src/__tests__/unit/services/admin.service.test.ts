import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildUser, buildFeatureFlag } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

describe('listUsers', () => {
  it('returns paginated users with defaults', async () => {
    const users = [buildUser(), buildUser()]
    prisma.user.findMany.mockResolvedValue(users)
    prisma.user.count.mockResolvedValue(2)

    const { listUsers } = await import('@/services/admin.service')
    const result = await listUsers({})

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } })
    )
    expect(prisma.user.count).toHaveBeenCalledWith({ where: {} })
    expect(result.data).toEqual(users)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })

  it('filters by role', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)

    const { listUsers } = await import('@/services/admin.service')
    await listUsers({ role: 'ADMIN' })

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'ADMIN' } })
    )
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'ADMIN' } })
  })

  it('filters by search', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)

    const { listUsers } = await import('@/services/admin.service')
    await listUsers({ search: 'john' })

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      })
    )
  })
})

describe('updateUserRole', () => {
  it('updates role and creates audit log', async () => {
    const user = buildUser({ role: 'NUTRITIONIST' })
    const updated = { id: user.id, name: user.name, email: user.email, role: 'ADMIN' }

    prisma.user.findUnique.mockResolvedValue(user)
    prisma.user.update.mockResolvedValue(updated)

    const { updateUserRole } = await import('@/services/admin.service')
    const result = await updateUserRole(user.id, 'ADMIN' as never, 'admin-1')

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      details: { oldRole: 'NUTRITIONIST', newRole: 'ADMIN' },
    })
  })

  it('throws when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const { updateUserRole } = await import('@/services/admin.service')
    await expect(updateUserRole('bad-id', 'ADMIN' as never, 'admin-1')).rejects.toThrow(
      'User not found'
    )

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('deactivateUser', () => {
  it('sets emailVerified to null and creates audit log', async () => {
    const user = buildUser()
    prisma.user.findUnique.mockResolvedValue(user)
    prisma.user.update.mockResolvedValue({ ...user, emailVerified: null })

    const { deactivateUser } = await import('@/services/admin.service')
    await deactivateUser(user.id, 'admin-1')

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { emailVerified: null },
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'DELETE',
      entity: 'User',
      entityId: user.id,
      details: { action: 'deactivated' },
    })
  })

  it('throws when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const { deactivateUser } = await import('@/services/admin.service')
    await expect(deactivateUser('bad-id', 'admin-1')).rejects.toThrow('User not found')

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('listFeatureFlags', () => {
  it('returns feature flags', async () => {
    const flags = [buildFeatureFlag(), buildFeatureFlag()]
    prisma.featureFlag.findMany.mockResolvedValue(flags)

    const { listFeatureFlags } = await import('@/services/admin.service')
    const result = await listFeatureFlags()

    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({
      orderBy: [{ isEnabled: 'desc' }, { key: 'asc' }],
    })
    expect(result).toEqual(flags)
  })
})

describe('getFeatureFlag', () => {
  it('returns flag by key', async () => {
    const flag = buildFeatureFlag({ key: 'my-feature' })
    prisma.featureFlag.findUnique.mockResolvedValue(flag)

    const { getFeatureFlag } = await import('@/services/admin.service')
    const result = await getFeatureFlag('my-feature')

    expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({ where: { key: 'my-feature' } })
    expect(result).toEqual(flag)
  })

  it('returns null for missing key', async () => {
    prisma.featureFlag.findUnique.mockResolvedValue(null)

    const { getFeatureFlag } = await import('@/services/admin.service')
    const result = await getFeatureFlag('non-existent')

    expect(result).toBeNull()
  })
})

describe('createFeatureFlag', () => {
  it('creates flag with audit log', async () => {
    const input = {
      key: 'new-feature',
      name: 'New Feature',
      description: 'A new feature',
      isEnabled: true,
      tiers: [],
    }
    const flag = buildFeatureFlag(input)
    prisma.featureFlag.create.mockResolvedValue(flag)

    const { createFeatureFlag } = await import('@/services/admin.service')
    const result = await createFeatureFlag(input, 'admin-1')

    expect(prisma.featureFlag.create).toHaveBeenCalled()
    expect(result).toEqual(flag)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'CREATE',
      entity: 'FeatureFlag',
      entityId: flag.id,
      details: { key: 'new-feature' },
    })
  })
})

describe('updateFeatureFlag', () => {
  it('updates flag and creates audit log', async () => {
    const existing = buildFeatureFlag()
    const input = { name: 'Updated Name' }
    const updated = { ...existing, name: 'Updated Name' }

    prisma.featureFlag.findUnique.mockResolvedValue(existing)
    prisma.featureFlag.update.mockResolvedValue(updated)

    const { updateFeatureFlag } = await import('@/services/admin.service')
    const result = await updateFeatureFlag(existing.id, input, 'admin-1')

    expect(prisma.featureFlag.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ name: 'Updated Name' }),
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'UPDATE',
      entity: 'FeatureFlag',
      entityId: existing.id,
      details: { updatedFields: ['name'] },
    })
  })

  it('throws when not found', async () => {
    prisma.featureFlag.findUnique.mockResolvedValue(null)

    const { updateFeatureFlag } = await import('@/services/admin.service')
    await expect(updateFeatureFlag('bad-id', { name: 'X' }, 'admin-1')).rejects.toThrow(
      'Feature flag not found'
    )

    expect(prisma.featureFlag.update).not.toHaveBeenCalled()
  })
})

describe('deleteFeatureFlag', () => {
  it('deletes flag and creates audit log', async () => {
    const existing = buildFeatureFlag()
    prisma.featureFlag.findUnique.mockResolvedValue(existing)
    prisma.featureFlag.delete.mockResolvedValue(existing)

    const { deleteFeatureFlag } = await import('@/services/admin.service')
    await deleteFeatureFlag(existing.id, 'admin-1')

    expect(prisma.featureFlag.delete).toHaveBeenCalledWith({ where: { id: existing.id } })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'DELETE',
      entity: 'FeatureFlag',
      entityId: existing.id,
      details: { key: existing.key },
    })
  })

  it('throws when not found', async () => {
    prisma.featureFlag.findUnique.mockResolvedValue(null)

    const { deleteFeatureFlag } = await import('@/services/admin.service')
    await expect(deleteFeatureFlag('bad-id', 'admin-1')).rejects.toThrow(
      'Feature flag not found'
    )

    expect(prisma.featureFlag.delete).not.toHaveBeenCalled()
  })
})

describe('isFeatureEnabled', () => {
  it('returns true for enabled flag with no tier restrictions', async () => {
    const flag = buildFeatureFlag({ isEnabled: true, tiers: [] })
    prisma.featureFlag.findUnique.mockResolvedValue(flag)

    const { isFeatureEnabled } = await import('@/services/admin.service')
    const result = await isFeatureEnabled('my-feature')

    expect(result).toBe(true)
  })

  it('returns false for disabled flag', async () => {
    const flag = buildFeatureFlag({ isEnabled: false })
    prisma.featureFlag.findUnique.mockResolvedValue(flag)

    const { isFeatureEnabled } = await import('@/services/admin.service')
    const result = await isFeatureEnabled('my-feature')

    expect(result).toBe(false)
  })

  it('returns true for tier-specific flag with matching tier', async () => {
    const flag = buildFeatureFlag({ isEnabled: true, tiers: ['PREMIUM', 'ENTERPRISE'] })
    prisma.featureFlag.findUnique.mockResolvedValue(flag)

    const { isFeatureEnabled } = await import('@/services/admin.service')
    const result = await isFeatureEnabled('my-feature', 'PREMIUM' as never)

    expect(result).toBe(true)
  })

  it('returns false for tier-specific flag with non-matching tier', async () => {
    const flag = buildFeatureFlag({ isEnabled: true, tiers: ['PREMIUM', 'ENTERPRISE'] })
    prisma.featureFlag.findUnique.mockResolvedValue(flag)

    const { isFeatureEnabled } = await import('@/services/admin.service')
    const result = await isFeatureEnabled('my-feature', 'FREE' as never)

    expect(result).toBe(false)
  })
})

describe('getSystemStats', () => {
  it('returns correct stats with groupBy results', async () => {
    prisma.user.count.mockResolvedValue(10)
    prisma.patient.count.mockResolvedValue(50)
    prisma.consultation.count.mockResolvedValue(100)
    prisma.mealPlan.count.mockResolvedValue(30)
    prisma.appointment.count.mockResolvedValue(25)
    prisma.subscription.count.mockResolvedValue(8)

    prisma.user.groupBy.mockResolvedValue([
      { role: 'ADMIN', _count: { role: 2 } },
      { role: 'NUTRITIONIST', _count: { role: 8 } },
    ])
    prisma.subscription.groupBy.mockResolvedValue([
      { tier: 'PREMIUM', _count: { tier: 5 } },
      { tier: 'FREE', _count: { tier: 3 } },
    ])

    const { getSystemStats } = await import('@/services/admin.service')
    const result = await getSystemStats()

    expect(result).toEqual({
      totalUsers: 10,
      totalPatients: 50,
      totalConsultations: 100,
      totalMealPlans: 30,
      totalAppointments: 25,
      activeSubscriptions: 8,
      usersByRole: { ADMIN: 2, NUTRITIONIST: 8 },
      subscriptionsByTier: { PREMIUM: 5, FREE: 3 },
    })
  })
})
