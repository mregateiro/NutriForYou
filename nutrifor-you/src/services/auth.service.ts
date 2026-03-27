import { UserRole, SubscriptionTier, AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  performedById: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  })

  await createAuditLog({
    userId: performedById,
    action: AuditAction.UPDATE,
    entity: 'User',
    entityId: userId,
    details: { field: 'role', oldValue: user.role, newValue: newRole },
  })

  logger.info({ userId, oldRole: user.role, newRole, performedById }, 'User role updated')
}

export async function updateSubscriptionTier(
  userId: string,
  newTier: SubscriptionTier,
  performedById: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionTier: newTier },
  })

  await createAuditLog({
    userId: performedById,
    action: AuditAction.UPDATE,
    entity: 'User',
    entityId: userId,
    details: { field: 'subscriptionTier', oldValue: user.subscriptionTier, newValue: newTier },
  })

  logger.info({ userId, oldTier: user.subscriptionTier, newTier, performedById }, 'Subscription tier updated')
}

export async function deactivateUser(
  userId: string,
  performedById: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  })

  await createAuditLog({
    userId: performedById,
    action: AuditAction.UPDATE,
    entity: 'User',
    entityId: userId,
    details: { field: 'isActive', newValue: false },
  })
}

export async function getUsers(params: {
  role?: UserRole
  organizationId?: string
  page?: number
  perPage?: number
}) {
  const { page = 1, perPage = 20, ...filters } = params
  const where: Record<string, unknown> = { isActive: true }

  if (filters.role) where.role = filters.role
  if (filters.organizationId) where.organizationId = filters.organizationId

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}
