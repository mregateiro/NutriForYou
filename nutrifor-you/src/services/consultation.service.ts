import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreateConsultationInput, UpdateConsultationInput, CreateTemplateInput } from '@/validators/consultation.schema'

export async function createConsultation(
  nutritionistId: string,
  input: CreateConsultationInput
) {
  // Verify patient belongs to nutritionist
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, nutritionistId, isActive: true },
  })
  if (!patient) throw new Error('Patient not found')

  // Calculate BMI if weight and height provided
  let bmi: number | undefined
  const weight = input.weight ?? patient.weight
  const height = input.height ?? patient.height
  if (weight && height) {
    bmi = weight / Math.pow(height / 100, 2)
  }

  const consultation = await prisma.consultation.create({
    data: {
      patientId: input.patientId,
      nutritionistId,
      templateId: input.templateId,
      title: input.title || `Consultation - ${patient.firstName} ${patient.lastName}`,
      chiefComplaint: input.chiefComplaint,
      notes: input.notes,
      assessment: input.assessment,
      plan: input.plan,
      privateNotes: input.privateNotes,
      duration: input.duration,
      weight: input.weight,
      height: input.height,
      bmi: bmi ? Math.round(bmi * 100) / 100 : undefined,
      bodyFat: input.bodyFat,
      waistCirc: input.waistCirc,
      hipCirc: input.hipCirc,
      status: input.status,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      completedAt: input.status === 'COMPLETED' ? new Date() : undefined,
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  // Update patient weight if provided
  if (input.weight) {
    await prisma.patient.update({
      where: { id: input.patientId },
      data: { weight: input.weight, height: input.height ?? undefined },
    })

    // Add weight entry
    await prisma.weightEntry.create({
      data: {
        patientId: input.patientId,
        weight: input.weight,
        notes: `Recorded during consultation`,
      },
    })
  }

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.CREATE,
    entity: 'Consultation',
    entityId: consultation.id,
    details: { patientId: input.patientId, status: input.status },
  })

  logger.info({ consultationId: consultation.id, nutritionistId }, 'Consultation created')
  return consultation
}

export async function getConsultationById(id: string, nutritionistId: string) {
  return prisma.consultation.findFirst({
    where: { id, nutritionistId },
    include: {
      patient: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          weight: true, height: true, goals: true,
        },
      },
      template: {
        select: { id: true, name: true },
      },
      attachments: {
        select: { id: true, fileName: true, fileSize: true, mimeType: true, createdAt: true },
      },
    },
  })
}

export async function updateConsultation(
  id: string,
  nutritionistId: string,
  input: UpdateConsultationInput
) {
  const existing = await prisma.consultation.findFirst({
    where: { id, nutritionistId },
  })
  if (!existing) throw new Error('Consultation not found')

  const consultation = await prisma.consultation.update({
    where: { id },
    data: {
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      completedAt: input.status === 'COMPLETED' && existing.status !== 'COMPLETED'
        ? new Date()
        : undefined,
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.UPDATE,
    entity: 'Consultation',
    entityId: id,
    details: { updatedFields: Object.keys(input) },
  })

  return consultation
}

export async function listConsultations(
  nutritionistId: string,
  params: { patientId?: string; status?: string; page?: number; perPage?: number }
) {
  const { page = 1, perPage = 20, patientId, status } = params
  const where: Record<string, unknown> = { nutritionistId }

  if (patientId) where.patientId = patientId
  if (status) where.status = status

  const [consultations, total] = await Promise.all([
    prisma.consultation.findMany({
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
    prisma.consultation.count({ where }),
  ])

  return {
    data: consultations,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}

export async function deleteConsultation(id: string, nutritionistId: string) {
  const existing = await prisma.consultation.findFirst({
    where: { id, nutritionistId },
  })
  if (!existing) throw new Error('Consultation not found')

  await prisma.consultation.delete({ where: { id } })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.DELETE,
    entity: 'Consultation',
    entityId: id,
  })

  logger.info({ consultationId: id, nutritionistId }, 'Consultation deleted')
}

// Template operations
export async function createTemplate(
  nutritionistId: string,
  input: CreateTemplateInput
) {
  if (input.isDefault) {
    // Unset any existing default
    await prisma.consultationTemplate.updateMany({
      where: { nutritionistId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const template = await prisma.consultationTemplate.create({
    data: {
      ...input,
      nutritionistId,
    },
  })

  logger.info({ templateId: template.id, nutritionistId }, 'Consultation template created')
  return template
}

export async function listTemplates(nutritionistId: string) {
  return prisma.consultationTemplate.findMany({
    where: { nutritionistId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
}

export async function getTemplateById(id: string, nutritionistId: string) {
  return prisma.consultationTemplate.findFirst({
    where: { id, nutritionistId },
  })
}
