import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { CreateFeatureFlagInput, UpdateFeatureFlagInput } from '@/validators/admin.schema'
import type { AuditAction, SubscriptionTier, UserRole } from '@prisma/client'
import { createAuditLog } from './audit.service'

// ─── User Management ───────────────────────────────────────

export async function listUsers(params: {
  role?: string
  search?: string
  page?: number
  perPage?: number
}) {
  const { page = 1, perPage = 20, role, search } = params
  const where: Record<string, unknown> = {}

  if (role) where.role = role
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        subscription: { select: { tier: true, status: true } },
        _count: { select: { patients: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  adminId: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  })

  await createAuditLog({
    userId: adminId,
    action: 'UPDATE' as AuditAction,
    entity: 'User',
    entityId: userId,
    details: { oldRole: user.role, newRole: role },
  })

  logger.info({ userId, role, adminId }, 'User role updated')
  return updated
}

export async function deactivateUser(userId: string, adminId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  // Soft deactivate — mark email as unverified, disable login
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: null },
  })

  await createAuditLog({
    userId: adminId,
    action: 'DELETE' as AuditAction,
    entity: 'User',
    entityId: userId,
    details: { action: 'deactivated' },
  })

  logger.info({ userId, adminId }, 'User deactivated')
}

// ─── Feature Flags ─────────────────────────────────────────

export async function listFeatureFlags() {
  return prisma.featureFlag.findMany({
    orderBy: [{ isEnabled: 'desc' }, { key: 'asc' }],
  })
}

export async function getFeatureFlag(key: string) {
  return prisma.featureFlag.findUnique({ where: { key } })
}

export async function createFeatureFlag(
  input: CreateFeatureFlagInput,
  adminId: string
) {
  const flag = await prisma.featureFlag.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      isEnabled: input.isEnabled,
      tiers: input.tiers as SubscriptionTier[],
      metadata: input.metadata ?? undefined,
    },
  })

  await createAuditLog({
    userId: adminId,
    action: 'CREATE' as AuditAction,
    entity: 'FeatureFlag',
    entityId: flag.id,
    details: { key: input.key },
  })

  logger.info({ flagId: flag.id, key: input.key, adminId }, 'Feature flag created')
  return flag
}

export async function updateFeatureFlag(
  id: string,
  input: UpdateFeatureFlagInput,
  adminId: string
) {
  const existing = await prisma.featureFlag.findUnique({ where: { id } })
  if (!existing) throw new Error('Feature flag not found')

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      isEnabled: input.isEnabled,
      tiers: input.tiers as SubscriptionTier[] | undefined,
      metadata: input.metadata ?? undefined,
    },
  })

  await createAuditLog({
    userId: adminId,
    action: 'UPDATE' as AuditAction,
    entity: 'FeatureFlag',
    entityId: id,
    details: { updatedFields: Object.keys(input) },
  })

  return flag
}

export async function deleteFeatureFlag(id: string, adminId: string) {
  const existing = await prisma.featureFlag.findUnique({ where: { id } })
  if (!existing) throw new Error('Feature flag not found')

  await prisma.featureFlag.delete({ where: { id } })

  await createAuditLog({
    userId: adminId,
    action: 'DELETE' as AuditAction,
    entity: 'FeatureFlag',
    entityId: id,
    details: { key: existing.key },
  })

  logger.info({ flagId: id, key: existing.key, adminId }, 'Feature flag deleted')
}

// Check if a feature is enabled for a given tier
export async function isFeatureEnabled(
  key: string,
  tier?: SubscriptionTier
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } })
  if (!flag || !flag.isEnabled) return false
  if (flag.tiers.length === 0) return true // enabled for all tiers
  if (!tier) return false
  return flag.tiers.includes(tier)
}

// ─── System Stats ──────────────────────────────────────────

export async function getSystemStats() {
  const [
    totalUsers,
    totalPatients,
    totalConsultations,
    totalMealPlans,
    totalAppointments,
    activeSubscriptions,
    usersByRole,
    subscriptionsByTier,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.patient.count(),
    prisma.consultation.count(),
    prisma.mealPlan.count(),
    prisma.appointment.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
    prisma.subscription.groupBy({
      by: ['tier'],
      _count: { tier: true },
      where: { status: { in: ['ACTIVE', 'TRIALING'] } },
    }),
  ])

  return {
    totalUsers,
    totalPatients,
    totalConsultations,
    totalMealPlans,
    totalAppointments,
    activeSubscriptions,
    usersByRole: usersByRole.reduce((acc, r) => {
      acc[r.role] = r._count.role
      return acc
    }, {} as Record<string, number>),
    subscriptionsByTier: subscriptionsByTier.reduce((acc, s) => {
      acc[s.tier] = s._count.tier
      return acc
    }, {} as Record<string, number>),
  }
}
