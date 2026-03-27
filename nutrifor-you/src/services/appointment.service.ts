import { AuditAction, AppointmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreateAppointmentInput, UpdateAppointmentInput, CreateAvailabilityRuleInput } from '@/validators/appointment.schema'

export async function createAppointment(
  nutritionistId: string,
  input: CreateAppointmentInput
) {
  // Verify patient belongs to nutritionist
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, nutritionistId, isActive: true },
  })
  if (!patient) throw new Error('Patient not found')

  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)

  if (endsAt <= startsAt) {
    throw new Error('End time must be after start time')
  }

  // Check for overlapping appointments
  const overlap = await prisma.appointment.findFirst({
    where: {
      nutritionistId,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      OR: [
        { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      ],
    },
  })
  if (overlap) throw new Error('Time slot overlaps with an existing appointment')

  const appointment = await prisma.appointment.create({
    data: {
      nutritionistId,
      patientId: input.patientId,
      title: input.title || `Appointment - ${patient.firstName} ${patient.lastName}`,
      description: input.description,
      startsAt,
      endsAt,
      type: input.type,
      location: input.location,
      videoLink: input.videoLink,
      notes: input.notes,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.CREATE,
    entity: 'Appointment',
    entityId: appointment.id,
    details: { patientId: input.patientId, startsAt: input.startsAt },
  })

  logger.info({ appointmentId: appointment.id, nutritionistId }, 'Appointment created')
  return appointment
}

export async function getAppointmentById(id: string, nutritionistId: string) {
  return prisma.appointment.findFirst({
    where: { id, nutritionistId },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      consultation: {
        select: { id: true, title: true, status: true },
      },
    },
  })
}

export async function updateAppointment(
  id: string,
  nutritionistId: string,
  input: UpdateAppointmentInput
) {
  const existing = await prisma.appointment.findFirst({
    where: { id, nutritionistId },
  })
  if (!existing) throw new Error('Appointment not found')

  const data: Record<string, unknown> = { ...input }
  if (input.startsAt) data.startsAt = new Date(input.startsAt)
  if (input.endsAt) data.endsAt = new Date(input.endsAt)

  // If rescheduling, check for overlaps
  const newStart = input.startsAt ? new Date(input.startsAt) : existing.startsAt
  const newEnd = input.endsAt ? new Date(input.endsAt) : existing.endsAt

  if (input.startsAt || input.endsAt) {
    const overlap = await prisma.appointment.findFirst({
      where: {
        nutritionistId,
        id: { not: id },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
        OR: [
          { startsAt: { lt: newEnd }, endsAt: { gt: newStart } },
        ],
      },
    })
    if (overlap) throw new Error('Time slot overlaps with an existing appointment')
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data,
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.UPDATE,
    entity: 'Appointment',
    entityId: id,
    details: { updatedFields: Object.keys(input) },
  })

  return appointment
}

export async function listAppointments(
  nutritionistId: string,
  params: {
    patientId?: string
    status?: AppointmentStatus
    from?: string
    to?: string
    page?: number
    perPage?: number
  }
) {
  const { page = 1, perPage = 50, patientId, status, from, to } = params
  const where: Record<string, unknown> = { nutritionistId }

  if (patientId) where.patientId = patientId
  if (status) where.status = status
  if (from || to) {
    const startsAt: Record<string, Date> = {}
    if (from) startsAt.gte = new Date(from)
    if (to) startsAt.lte = new Date(to)
    where.startsAt = startsAt
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startsAt: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.appointment.count({ where }),
  ])

  return {
    data: appointments,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function deleteAppointment(id: string, nutritionistId: string) {
  const existing = await prisma.appointment.findFirst({
    where: { id, nutritionistId },
  })
  if (!existing) throw new Error('Appointment not found')

  await prisma.appointment.delete({ where: { id } })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.DELETE,
    entity: 'Appointment',
    entityId: id,
  })

  logger.info({ appointmentId: id, nutritionistId }, 'Appointment deleted')
}

// ─── Availability Rules ──────────────────────────────────

export async function createAvailabilityRule(
  nutritionistId: string,
  input: CreateAvailabilityRuleInput
) {
  const rule = await prisma.availabilityRule.create({
    data: {
      ...input,
      nutritionistId,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
    },
  })

  logger.info({ ruleId: rule.id, nutritionistId }, 'Availability rule created')
  return rule
}

export async function listAvailabilityRules(nutritionistId: string) {
  return prisma.availabilityRule.findMany({
    where: { nutritionistId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
}

export async function deleteAvailabilityRule(id: string, nutritionistId: string) {
  const existing = await prisma.availabilityRule.findFirst({
    where: { id, nutritionistId },
  })
  if (!existing) throw new Error('Availability rule not found')

  await prisma.availabilityRule.delete({ where: { id } })

  logger.info({ ruleId: id, nutritionistId }, 'Availability rule deleted')
}

export async function getAvailableSlots(
  nutritionistId: string,
  date: string
) {
  const targetDate = new Date(date)
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const
  const dayOfWeek = days[targetDate.getDay()]

  // Get availability rules for this day
  const rules = await prisma.availabilityRule.findMany({
    where: {
      nutritionistId,
      dayOfWeek,
      isActive: true,
      OR: [
        { validFrom: null, validUntil: null },
        { validFrom: { lte: targetDate }, validUntil: null },
        { validFrom: null, validUntil: { gte: targetDate } },
        { validFrom: { lte: targetDate }, validUntil: { gte: targetDate } },
      ],
    },
  })

  if (rules.length === 0) return []

  // Get existing appointments for this day
  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      nutritionistId,
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    select: { startsAt: true, endsAt: true },
  })

  // Generate available slots
  const slots: { startTime: string; endTime: string; available: boolean }[] = []

  for (const rule of rules) {
    const [startH, startM] = rule.startTime.split(':').map(Number)
    const [endH, endM] = rule.endTime.split(':').map(Number)
    const slotMinutes = rule.slotDuration

    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    while (currentMinutes + slotMinutes <= endMinutes) {
      const slotStart = new Date(dayStart)
      slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0)
      const slotEnd = new Date(dayStart)
      slotEnd.setHours(Math.floor((currentMinutes + slotMinutes) / 60), (currentMinutes + slotMinutes) % 60, 0, 0)

      const isBooked = existingAppointments.some(apt =>
        apt.startsAt < slotEnd && apt.endsAt > slotStart
      )

      slots.push({
        startTime: `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`,
        endTime: `${String(Math.floor((currentMinutes + slotMinutes) / 60)).padStart(2, '0')}:${String((currentMinutes + slotMinutes) % 60).padStart(2, '0')}`,
        available: !isBooked,
      })

      currentMinutes += slotMinutes
    }
  }

  return slots
}
