import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createAuditLog } from './audit.service'
import type { AuditAction } from '@prisma/client'
import type { UpdateOrganizationInput } from '@/validators/admin.schema'

export async function getOrganization(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  })

  if (!user?.organizationId) return null

  return prisma.organization.findUnique({
    where: { id: user.organizationId },
  })
}

export async function updateOrganization(
  userId: string,
  input: UpdateOrganizationInput
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, role: true },
  })

  if (!user?.organizationId) throw new Error('No organization found')

  const org = await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      name: input.name,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      website: input.website,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      country: input.country,
      postalCode: input.postalCode,
      taxId: input.taxId,
    },
  })

  await createAuditLog({
    userId,
    action: 'UPDATE' as AuditAction,
    entity: 'Organization',
    entityId: org.id,
    details: { updatedFields: Object.keys(input) },
  })

  logger.info({ orgId: org.id, userId }, 'Organization updated')
  return org
}

export async function getOrganizationBranding(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
    },
  })
}
