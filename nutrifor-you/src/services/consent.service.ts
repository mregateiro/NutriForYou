import { AuditAction, ConsentPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { GrantConsentInput } from '@/validators/consent.schema'

export async function grantConsent(
  userId: string,
  input: GrantConsentInput,
  ipAddress?: string
) {
  // Revoke any existing consent for this purpose
  await prisma.consent.updateMany({
    where: {
      userId,
      purpose: input.purpose,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })

  const consent = await prisma.consent.create({
    data: {
      userId,
      purpose: input.purpose,
      granted: input.granted,
      version: input.version,
      ipAddress,
      grantedAt: new Date(),
    },
  })

  await createAuditLog({
    userId,
    action: AuditAction.CREATE,
    entity: 'Consent',
    entityId: consent.id,
    details: { purpose: input.purpose, granted: input.granted },
  })

  logger.info({ userId, purpose: input.purpose, granted: input.granted }, 'Consent recorded')
  return consent
}

export async function getConsents(userId: string) {
  return prisma.consent.findMany({
    where: { userId, revokedAt: null },
    orderBy: { grantedAt: 'desc' },
  })
}

export async function getConsentHistory(userId: string) {
  return prisma.consent.findMany({
    where: { userId },
    orderBy: { grantedAt: 'desc' },
  })
}

export async function revokeConsent(
  userId: string,
  purpose: ConsentPurpose
) {
  const updated = await prisma.consent.updateMany({
    where: {
      userId,
      purpose,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Consent',
    details: { purpose, action: 'revoke' },
  })

  logger.info({ userId, purpose }, 'Consent revoked')
  return updated
}

export async function exportUserData(userId: string) {
  const [
    user,
    consents,
    auditLogs,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        subscriptionTier: true,
        timezone: true,
        locale: true,
        createdAt: true,
      },
    }),
    prisma.consent.findMany({
      where: { userId },
      select: {
        purpose: true,
        granted: true,
        version: true,
        grantedAt: true,
        revokedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      select: {
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ])

  // If user is a nutritionist, also export their patient-related data
  let patients = null
  let consultations = null
  let mealPlans = null

  if (user?.role === 'NUTRITIONIST') {
    ;[patients, consultations, mealPlans] = await Promise.all([
      prisma.patient.findMany({
        where: { nutritionistId: userId, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.consultation.findMany({
        where: { nutritionistId: userId },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          patientId: true,
        },
      }),
      prisma.mealPlan.findMany({
        where: { nutritionistId: userId },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          patientId: true,
        },
      }),
    ])
  }

  await createAuditLog({
    userId,
    action: AuditAction.EXPORT,
    entity: 'UserData',
    details: { type: 'full_export' },
  })

  return {
    exportedAt: new Date().toISOString(),
    user,
    consents,
    patients,
    consultations,
    mealPlans,
    auditLogs,
  }
}

export async function requestDataErasure(
  userId: string,
  confirmEmail: string,
  reason?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  if (!user || user.email !== confirmEmail) {
    throw new Error('Email confirmation does not match')
  }

  // Soft-delete: deactivate user and anonymize data
  await prisma.$transaction(async (tx) => {
    // Soft-delete all patients
    await tx.patient.updateMany({
      where: { nutritionistId: userId },
      data: { isActive: false, deletedAt: new Date() },
    })

    // Deactivate user account
    await tx.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        email: `deleted_${userId}@erased.nutriforyou.com`,
        name: 'Deleted User',
        firstName: null,
        lastName: null,
        phone: null,
        avatarUrl: null,
      },
    })

    // Revoke all consents
    await tx.consent.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  })

  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    entity: 'UserData',
    details: { type: 'erasure_request', reason },
  })

  logger.info({ userId }, 'Data erasure completed')
  return { success: true, message: 'Account data has been erased' }
}
