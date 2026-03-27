import { AuditAction, ContractStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreateContractInput, UpdateContractInput } from '@/validators/contract.schema'

export async function createContract(
  nutritionistId: string,
  input: CreateContractInput
) {
  // Verify patient belongs to nutritionist
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, nutritionistId, isActive: true },
  })
  if (!patient) throw new Error('Patient not found')

  const contract = await prisma.contract.create({
    data: {
      createdById: nutritionistId,
      patientId: input.patientId,
      title: input.title,
      content: input.content,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.CREATE,
    entity: 'Contract',
    entityId: contract.id,
    details: { patientId: input.patientId },
  })

  logger.info({ contractId: contract.id, nutritionistId }, 'Contract created')
  return contract
}

export async function getContractById(id: string, userId: string) {
  return prisma.contract.findFirst({
    where: {
      id,
      OR: [{ createdById: userId }, { patient: { nutritionistId: userId } }],
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

export async function updateContract(
  id: string,
  userId: string,
  input: UpdateContractInput
) {
  const existing = await prisma.contract.findFirst({
    where: { id, createdById: userId },
  })
  if (!existing) throw new Error('Contract not found')

  if (existing.status === ContractStatus.SIGNED) {
    throw new Error('Cannot edit a signed contract')
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      title: input.title,
      content: input.content,
      status: input.status as ContractStatus | undefined,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Contract',
    entityId: id,
    details: { updatedFields: Object.keys(input) },
  })

  logger.info({ contractId: id, userId }, 'Contract updated')
  return contract
}

export async function listContracts(
  userId: string,
  params: { patientId?: string; status?: string; page?: number; perPage?: number }
) {
  const { page = 1, perPage = 20, patientId, status } = params
  const where: Record<string, unknown> = { createdById: userId }

  if (patientId) where.patientId = patientId
  if (status) where.status = status

  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.contract.count({ where }),
  ])

  return {
    data: contracts,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}

export async function signContract(
  id: string,
  patientUserId: string,
  signatureData: string
) {
  // Find contract where the patient matches
  const contract = await prisma.contract.findFirst({
    where: {
      id,
      status: ContractStatus.SENT,
      patient: { userId: patientUserId },
    },
  })
  if (!contract) throw new Error('Contract not found or not available for signing')

  if (contract.expiresAt && contract.expiresAt < new Date()) {
    // Auto-expire
    await prisma.contract.update({
      where: { id },
      data: { status: ContractStatus.EXPIRED },
    })
    throw new Error('Contract has expired')
  }

  const signed = await prisma.contract.update({
    where: { id },
    data: {
      status: ContractStatus.SIGNED,
      signatureData,
      signedAt: new Date(),
    },
  })

  await createAuditLog({
    userId: patientUserId,
    action: AuditAction.UPDATE,
    entity: 'Contract',
    entityId: id,
    details: { action: 'signed' },
  })

  logger.info({ contractId: id, patientUserId }, 'Contract signed')
  return signed
}

export async function revokeContract(id: string, userId: string) {
  const existing = await prisma.contract.findFirst({
    where: { id, createdById: userId },
  })
  if (!existing) throw new Error('Contract not found')

  if (existing.status === ContractStatus.REVOKED) {
    throw new Error('Contract is already revoked')
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: { status: ContractStatus.REVOKED },
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Contract',
    entityId: id,
    details: { action: 'revoked' },
  })

  logger.info({ contractId: id, userId }, 'Contract revoked')
  return contract
}

export async function deleteContract(id: string, userId: string) {
  const existing = await prisma.contract.findFirst({
    where: { id, createdById: userId, status: ContractStatus.DRAFT },
  })
  if (!existing) throw new Error('Only draft contracts can be deleted')

  await prisma.contract.delete({ where: { id } })

  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    entity: 'Contract',
    entityId: id,
  })

  logger.info({ contractId: id, userId }, 'Contract deleted')
}
