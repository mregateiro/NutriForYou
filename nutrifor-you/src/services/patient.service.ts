import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreatePatientInput, UpdatePatientInput, SearchPatientsInput } from '@/validators/patient.schema'

export async function createPatient(
  nutritionistId: string,
  input: CreatePatientInput
) {
  const patient = await prisma.patient.create({
    data: {
      ...input,
      email: input.email || undefined,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      nutritionistId,
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.CREATE,
    entity: 'Patient',
    entityId: patient.id,
    details: { firstName: patient.firstName, lastName: patient.lastName },
  })

  logger.info({ patientId: patient.id, nutritionistId }, 'Patient created')
  return patient
}

export async function getPatientById(patientId: string, nutritionistId: string) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      nutritionistId,
      isActive: true,
    },
    include: {
      weightEntries: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          consultations: true,
          mealPlans: true,
          documents: true,
          appointments: true,
        },
      },
    },
  })

  return patient
}

export async function updatePatient(
  patientId: string,
  nutritionistId: string,
  input: UpdatePatientInput
) {
  // Verify ownership
  const existing = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId, isActive: true },
  })

  if (!existing) throw new Error('Patient not found')

  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...input,
      email: input.email || undefined,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.UPDATE,
    entity: 'Patient',
    entityId: patientId,
    details: { updatedFields: Object.keys(input) },
  })

  return patient
}

export async function deletePatient(patientId: string, nutritionistId: string) {
  const existing = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId, isActive: true },
  })

  if (!existing) throw new Error('Patient not found')

  // Soft delete for GDPR compliance
  await prisma.patient.update({
    where: { id: patientId },
    data: { isActive: false, deletedAt: new Date() },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.DELETE,
    entity: 'Patient',
    entityId: patientId,
  })

  logger.info({ patientId, nutritionistId }, 'Patient soft-deleted')
}

export async function searchPatients(
  nutritionistId: string,
  params: SearchPatientsInput
) {
  const { query, page, perPage, sortBy, sortOrder } = params

  const where: Record<string, unknown> = {
    nutritionistId,
    isActive: true,
  }

  if (query) {
    where.OR = [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query } },
    ]
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        weight: true,
        targetWeight: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { consultations: true, mealPlans: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.patient.count({ where }),
  ])

  return {
    data: patients,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}

export async function getPatientTimeline(patientId: string, nutritionistId: string) {
  // Verify ownership
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId, isActive: true },
  })
  if (!patient) throw new Error('Patient not found')

  const [consultations, appointments, documents, mealPlans, weightEntries] = await Promise.all([
    prisma.consultation.findMany({
      where: { patientId },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: { patientId },
      select: { id: true, title: true, status: true, startsAt: true },
      orderBy: { startsAt: 'desc' },
      take: 20,
    }),
    prisma.document.findMany({
      where: { patientId },
      select: { id: true, fileName: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.mealPlan.findMany({
      where: { patientId },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.weightEntry.findMany({
      where: { patientId },
      select: { id: true, weight: true, recordedAt: true },
      orderBy: { recordedAt: 'desc' },
      take: 20,
    }),
  ])

  // Merge into timeline
  type TimelineItem = { id: string; type: string; title: string; date: Date; details?: Record<string, unknown> }
  const timeline: TimelineItem[] = [
    ...consultations.map(c => ({
      id: c.id,
      type: 'consultation' as const,
      title: c.title || 'Consultation',
      date: c.createdAt,
      details: { status: c.status },
    })),
    ...appointments.map(a => ({
      id: a.id,
      type: 'appointment' as const,
      title: a.title || 'Appointment',
      date: a.startsAt,
      details: { status: a.status },
    })),
    ...documents.map(d => ({
      id: d.id,
      type: 'document' as const,
      title: d.fileName,
      date: d.createdAt,
      details: { documentType: d.type },
    })),
    ...mealPlans.map(m => ({
      id: m.id,
      type: 'meal_plan' as const,
      title: m.title,
      date: m.createdAt,
      details: { status: m.status },
    })),
    ...weightEntries.map(w => ({
      id: w.id,
      type: 'weight_entry' as const,
      title: `Weight: ${w.weight} kg`,
      date: w.recordedAt,
    })),
  ]

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime())

  return timeline
}
