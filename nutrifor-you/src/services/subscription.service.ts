import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import { AuditAction } from '@prisma/client'
import type { ChangeSubscriptionInput } from '@/validators/subscription.schema'
import { SUBSCRIPTION_PLANS } from '@/config/constants'

export async function getSubscription(userId: string) {
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  // Create default trial subscription if none exists
  if (!subscription) {
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 30)

    subscription = await prisma.subscription.create({
      data: {
        userId,
        tier: 'TRIAL',
        status: 'TRIALING',
        trialEndsAt: trialEnd,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
      },
    })
  }

  return subscription
}

export async function changeSubscription(
  userId: string,
  input: ChangeSubscriptionInput
) {
  const existing = await getSubscription(userId)

  const now = new Date()
  const periodEnd = new Date(now)
  if (input.billingCycle === 'ANNUAL') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  const subscription = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      tier: input.tier,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
    },
  })

  // Also update user's subscription tier
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionTier: input.tier },
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Subscription',
    entityId: subscription.id,
    details: { newTier: input.tier, billingCycle: input.billingCycle },
  })

  logger.info({ userId, tier: input.tier }, 'Subscription changed')
  return subscription
}

export async function cancelSubscription(
  userId: string,
  reason?: string,
  immediate?: boolean
) {
  const existing = await getSubscription(userId)

  const subscription = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
      // If immediate, end now. Otherwise, let it run until period end
      ...(immediate ? { currentPeriodEnd: new Date() } : {}),
    },
  })

  if (immediate) {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'TRIAL' },
    })
  }

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Subscription',
    entityId: subscription.id,
    details: { action: 'cancel', reason, immediate },
  })

  logger.info({ userId, reason }, 'Subscription canceled')
  return subscription
}

export function checkFeatureAccess(
  subscriptionTier: string,
  feature: string
): boolean {
  const tierKey = subscriptionTier as keyof typeof SUBSCRIPTION_PLANS
  const plan = SUBSCRIPTION_PLANS[tierKey]
  if (!plan) return false

  return (plan.features as readonly string[]).includes(feature)
}

export function getSubscriptionLimits(subscriptionTier: string) {
  const tierKey = subscriptionTier as keyof typeof SUBSCRIPTION_PLANS
  const plan = SUBSCRIPTION_PLANS[tierKey]
  if (!plan) return { maxPatients: 0, maxConsultations: 0 }

  return {
    maxPatients: plan.maxPatients,
    maxConsultations: plan.maxConsultations,
  }
}

export const PRICING = {
  LITE: { monthly: 9.90, annual: 99.00, currency: 'EUR' },
  PREMIUM: { monthly: 24.90, annual: 249.00, currency: 'EUR' },
  BUSINESS: { monthly: 49.90, annual: 499.00, currency: 'EUR' },
} as const
