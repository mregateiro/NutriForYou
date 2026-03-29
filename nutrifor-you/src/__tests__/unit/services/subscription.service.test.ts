import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '@/__tests__/helpers/mock-prisma'
import { buildSubscription } from '@/__tests__/helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getSubscription
// ---------------------------------------------------------------------------
describe('getSubscription', () => {
  it('returns existing subscription when found', async () => {
    const subscription = buildSubscription()
    prisma.subscription.findUnique.mockResolvedValue(subscription)

    const { getSubscription } = await import('@/services/subscription.service')
    const result = await getSubscription('test-user-id')

    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
    })
    expect(result).toEqual(subscription)
    expect(prisma.subscription.create).not.toHaveBeenCalled()
  })

  it('creates a trial subscription when none exists', async () => {
    const trialSubscription = buildSubscription({
      tier: 'TRIAL',
      status: 'TRIALING',
    })
    prisma.subscription.findUnique.mockResolvedValue(null)
    prisma.subscription.create.mockResolvedValue(trialSubscription)

    const { getSubscription } = await import('@/services/subscription.service')
    const result = await getSubscription('test-user-id')

    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
    })
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'test-user-id',
        tier: 'TRIAL',
        status: 'TRIALING',
      }),
    })
    expect(result).toEqual(trialSubscription)
  })
})

// ---------------------------------------------------------------------------
// changeSubscription
// ---------------------------------------------------------------------------
describe('changeSubscription', () => {
  it('sets period end 1 year ahead for ANNUAL billing cycle', async () => {
    const existing = buildSubscription()
    const updated = buildSubscription({ tier: 'BUSINESS', status: 'ACTIVE' })

    prisma.subscription.findUnique.mockResolvedValue(existing)
    prisma.subscription.update.mockResolvedValue(updated)
    prisma.user.update.mockResolvedValue({})

    const { changeSubscription } = await import('@/services/subscription.service')
    const result = await changeSubscription('test-user-id', {
      tier: 'BUSINESS',
      billingCycle: 'ANNUAL',
    })

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        tier: 'BUSINESS',
        status: 'ACTIVE',
        trialEndsAt: null,
      }),
    })

    const callArgs = prisma.subscription.update.mock.calls[0][0] as {
      data: { currentPeriodStart: Date; currentPeriodEnd: Date }
    }
    const start = callArgs.data.currentPeriodStart
    const end = callArgs.data.currentPeriodEnd
    const diffMs = end.getTime() - start.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(365)
    expect(diffDays).toBeLessThanOrEqual(366)

    expect(result).toEqual(updated)
  })

  it('sets period end 1 month ahead for MONTHLY billing cycle', async () => {
    const existing = buildSubscription()
    const updated = buildSubscription({ tier: 'LITE', status: 'ACTIVE' })

    prisma.subscription.findUnique.mockResolvedValue(existing)
    prisma.subscription.update.mockResolvedValue(updated)
    prisma.user.update.mockResolvedValue({})

    const { changeSubscription } = await import('@/services/subscription.service')
    await changeSubscription('test-user-id', {
      tier: 'LITE',
      billingCycle: 'MONTHLY',
    })

    const callArgs = prisma.subscription.update.mock.calls[0][0] as {
      data: { currentPeriodStart: Date; currentPeriodEnd: Date }
    }
    const start = callArgs.data.currentPeriodStart
    const end = callArgs.data.currentPeriodEnd
    const diffMs = end.getTime() - start.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(28)
    expect(diffDays).toBeLessThanOrEqual(31)
  })

  it('updates user subscription tier', async () => {
    const existing = buildSubscription()
    const updated = buildSubscription({ tier: 'PREMIUM', status: 'ACTIVE' })

    prisma.subscription.findUnique.mockResolvedValue(existing)
    prisma.subscription.update.mockResolvedValue(updated)
    prisma.user.update.mockResolvedValue({})

    const { changeSubscription } = await import('@/services/subscription.service')
    await changeSubscription('test-user-id', {
      tier: 'PREMIUM',
      billingCycle: 'MONTHLY',
    })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'test-user-id' },
      data: { subscriptionTier: 'PREMIUM' },
    })
  })

  it('creates an audit log entry', async () => {
    const existing = buildSubscription()
    const updated = buildSubscription({ tier: 'LITE', status: 'ACTIVE' })

    prisma.subscription.findUnique.mockResolvedValue(existing)
    prisma.subscription.update.mockResolvedValue(updated)
    prisma.user.update.mockResolvedValue({})

    const { changeSubscription } = await import('@/services/subscription.service')
    await changeSubscription('test-user-id', {
      tier: 'LITE',
      billingCycle: 'MONTHLY',
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-user-id',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: updated.id,
      details: { newTier: 'LITE', billingCycle: 'MONTHLY' },
    })
  })
})

// ---------------------------------------------------------------------------
// cancelSubscription
// ---------------------------------------------------------------------------
describe('cancelSubscription', () => {
  it('immediate cancellation sets period end to now and downgrades user to TRIAL', async () => {
    const existing = buildSubscription()
    const canceled = buildSubscription({ status: 'CANCELED', canceledAt: new Date() })

    prisma.subscription.findUnique.mockResolvedValue(existing)
    prisma.subscription.update.mockResolvedValue(canceled)
    prisma.user.update.mockResolvedValue({})

    const { cancelSubscription } = await import('@/services/subscription.service')
    const result = await cancelSubscription('test-user-id', 'Too expensive', true)

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        status: 'CANCELED',
        canceledAt: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
      }),
    })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'test-user-id' },
      data: { subscriptionTier: 'TRIAL' },
    })

    expect(result).toEqual(canceled)
  })

  it('non-immediate cancellation does not update user tier', async () => {
    const existing = buildSubscription()
    const canceled = buildSubscription({ status: 'CANCELED', canceledAt: new Date() })

    prisma.subscription.findUnique.mockResolvedValue(existing)
    prisma.subscription.update.mockResolvedValue(canceled)

    const { cancelSubscription } = await import('@/services/subscription.service')
    await cancelSubscription('test-user-id', 'Switching provider', false)

    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('creates an audit log entry with cancel details', async () => {
    const existing = buildSubscription()
    const canceled = buildSubscription({ status: 'CANCELED', canceledAt: new Date() })

    prisma.subscription.findUnique.mockResolvedValue(existing)
    prisma.subscription.update.mockResolvedValue(canceled)
    prisma.user.update.mockResolvedValue({})

    const { cancelSubscription } = await import('@/services/subscription.service')
    await cancelSubscription('test-user-id', 'Too expensive', true)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-user-id',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: canceled.id,
      details: { action: 'cancel', reason: 'Too expensive', immediate: true },
    })
  })
})

// ---------------------------------------------------------------------------
// checkFeatureAccess
// ---------------------------------------------------------------------------
describe('checkFeatureAccess', () => {
  it('returns true when TRIAL tier has patient_management', async () => {
    const { checkFeatureAccess } = await import('@/services/subscription.service')
    expect(checkFeatureAccess('TRIAL', 'patient_management')).toBe(true)
  })

  it('returns false when TRIAL tier does not have ai_meal_plans', async () => {
    const { checkFeatureAccess } = await import('@/services/subscription.service')
    expect(checkFeatureAccess('TRIAL', 'ai_meal_plans')).toBe(false)
  })

  it('returns true when PREMIUM tier has ai_meal_plans', async () => {
    const { checkFeatureAccess } = await import('@/services/subscription.service')
    expect(checkFeatureAccess('PREMIUM', 'ai_meal_plans')).toBe(true)
  })

  it('returns true when BUSINESS tier has team_management', async () => {
    const { checkFeatureAccess } = await import('@/services/subscription.service')
    expect(checkFeatureAccess('BUSINESS', 'team_management')).toBe(true)
  })

  it('returns false for an invalid tier', async () => {
    const { checkFeatureAccess } = await import('@/services/subscription.service')
    expect(checkFeatureAccess('INVALID', 'patient_management')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getSubscriptionLimits
// ---------------------------------------------------------------------------
describe('getSubscriptionLimits', () => {
  it('returns correct limits for TRIAL tier', async () => {
    const { getSubscriptionLimits } = await import('@/services/subscription.service')
    expect(getSubscriptionLimits('TRIAL')).toEqual({
      maxPatients: 5,
      maxConsultations: 10,
    })
  })

  it('returns unlimited (-1) limits for PREMIUM tier', async () => {
    const { getSubscriptionLimits } = await import('@/services/subscription.service')
    expect(getSubscriptionLimits('PREMIUM')).toEqual({
      maxPatients: -1,
      maxConsultations: -1,
    })
  })

  it('returns zero limits for an invalid tier', async () => {
    const { getSubscriptionLimits } = await import('@/services/subscription.service')
    expect(getSubscriptionLimits('INVALID')).toEqual({
      maxPatients: 0,
      maxConsultations: 0,
    })
  })
})
