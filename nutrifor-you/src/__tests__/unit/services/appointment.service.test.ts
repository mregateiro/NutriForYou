import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import {
  buildAppointment,
  buildAvailabilityRule,
  buildPatient,
} from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ─── createAppointment ─────────────────────────────────────

describe('createAppointment', () => {
  const nutritionistId = 'nutri-1'
  const input = {
    patientId: 'p1',
    startsAt: '2025-06-01T09:00:00Z',
    endsAt: '2025-06-01T10:00:00Z',
    type: 'IN_PERSON' as const,
  }

  it('creates an appointment successfully', async () => {
    const patient = buildPatient({ id: 'p1', nutritionistId })
    const appointment = buildAppointment({ nutritionistId, patientId: 'p1' })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.appointment.findFirst.mockResolvedValue(null)
    prisma.appointment.create.mockResolvedValue(appointment)

    const { createAppointment } = await import('@/services/appointment.service')
    const result = await createAppointment(nutritionistId, input as never)

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', nutritionistId, isActive: true },
    })
    expect(prisma.appointment.create).toHaveBeenCalled()
    expect(result).toEqual(appointment)
  })

  it('throws when patient is not found', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { createAppointment } = await import('@/services/appointment.service')

    await expect(createAppointment(nutritionistId, input as never)).rejects.toThrow(
      'Patient not found'
    )
    expect(prisma.appointment.create).not.toHaveBeenCalled()
  })

  it('throws when end time is before start time', async () => {
    const patient = buildPatient({ id: 'p1', nutritionistId })
    prisma.patient.findFirst.mockResolvedValue(patient)

    const badInput = {
      ...input,
      startsAt: '2025-06-01T10:00:00Z',
      endsAt: '2025-06-01T09:00:00Z',
    }

    const { createAppointment } = await import('@/services/appointment.service')

    await expect(createAppointment(nutritionistId, badInput as never)).rejects.toThrow(
      'End time must be after start time'
    )
    expect(prisma.appointment.create).not.toHaveBeenCalled()
  })

  it('throws when time slot overlaps with an existing appointment', async () => {
    const patient = buildPatient({ id: 'p1', nutritionistId })
    const existingAppt = buildAppointment({ nutritionistId })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.appointment.findFirst.mockResolvedValue(existingAppt)

    const { createAppointment } = await import('@/services/appointment.service')

    await expect(createAppointment(nutritionistId, input as never)).rejects.toThrow(
      'Time slot overlaps with an existing appointment'
    )
    expect(prisma.appointment.create).not.toHaveBeenCalled()
  })
})

// ─── getAppointmentById ────────────────────────────────────

describe('getAppointmentById', () => {
  it('returns appointment by id and nutritionistId', async () => {
    const appointment = buildAppointment()
    prisma.appointment.findFirst.mockResolvedValue(appointment)

    const { getAppointmentById } = await import('@/services/appointment.service')
    const result = await getAppointmentById('appt-1', 'nutri-1')

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
      where: { id: 'appt-1', nutritionistId: 'nutri-1' },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        consultation: {
          select: { id: true, title: true, status: true },
        },
      },
    })
    expect(result).toEqual(appointment)
  })
})

// ─── updateAppointment ────────────────────────────────────

describe('updateAppointment', () => {
  const nutritionistId = 'nutri-1'

  it('updates an appointment successfully', async () => {
    const existing = buildAppointment({
      id: 'appt-1',
      nutritionistId,
      startsAt: new Date('2025-06-01T09:00:00Z'),
      endsAt: new Date('2025-06-01T10:00:00Z'),
    })
    const updated = { ...existing, title: 'Updated Title' }

    prisma.appointment.findFirst.mockResolvedValue(existing)
    prisma.appointment.update.mockResolvedValue(updated)

    const { updateAppointment } = await import('@/services/appointment.service')
    const result = await updateAppointment('appt-1', nutritionistId, {
      title: 'Updated Title',
    } as never)

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-1' },
      data: { title: 'Updated Title' },
    })
    expect(result).toEqual(updated)
  })

  it('checks overlap excluding self when rescheduling', async () => {
    const existing = buildAppointment({
      id: 'appt-1',
      nutritionistId,
      startsAt: new Date('2025-06-01T09:00:00Z'),
      endsAt: new Date('2025-06-01T10:00:00Z'),
    })
    const updated = { ...existing, startsAt: new Date('2025-06-01T11:00:00Z') }

    // First findFirst returns existing appointment
    prisma.appointment.findFirst
      .mockResolvedValueOnce(existing)
      // Second findFirst is the overlap check — no overlap
      .mockResolvedValueOnce(null)
    prisma.appointment.update.mockResolvedValue(updated)

    const { updateAppointment } = await import('@/services/appointment.service')
    await updateAppointment('appt-1', nutritionistId, {
      startsAt: '2025-06-01T11:00:00Z',
    } as never)

    // Overlap check should exclude self
    expect(prisma.appointment.findFirst).toHaveBeenCalledTimes(2)
    const overlapCall = prisma.appointment.findFirst.mock.calls[1][0]
    expect(overlapCall.where.id).toEqual({ not: 'appt-1' })
  })

  it('throws when appointment is not found', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null)

    const { updateAppointment } = await import('@/services/appointment.service')

    await expect(
      updateAppointment('appt-1', nutritionistId, { title: 'x' } as never)
    ).rejects.toThrow('Appointment not found')
  })
})

// ─── listAppointments ─────────────────────────────────────

describe('listAppointments', () => {
  const nutritionistId = 'nutri-1'

  it('applies from/to date filters', async () => {
    const appointments = [buildAppointment()]
    prisma.appointment.findMany.mockResolvedValue(appointments)
    prisma.appointment.count.mockResolvedValue(1)

    const { listAppointments } = await import('@/services/appointment.service')
    await listAppointments(nutritionistId, {
      from: '2025-06-01',
      to: '2025-06-30',
    })

    const findManyCall = prisma.appointment.findMany.mock.calls[0][0]
    expect(findManyCall.where.startsAt).toEqual({
      gte: new Date('2025-06-01'),
      lte: new Date('2025-06-30'),
    })
  })

  it('uses default pagination of perPage=50', async () => {
    prisma.appointment.findMany.mockResolvedValue([])
    prisma.appointment.count.mockResolvedValue(0)

    const { listAppointments } = await import('@/services/appointment.service')
    const result = await listAppointments(nutritionistId, {})

    const findManyCall = prisma.appointment.findMany.mock.calls[0][0]
    expect(findManyCall.take).toBe(50)
    expect(findManyCall.skip).toBe(0)
    expect(result.pagination).toEqual({
      page: 1,
      perPage: 50,
      total: 0,
      totalPages: 0,
    })
  })
})

// ─── deleteAppointment ────────────────────────────────────

describe('deleteAppointment', () => {
  const nutritionistId = 'nutri-1'

  it('deletes an existing appointment', async () => {
    const existing = buildAppointment({ id: 'appt-1', nutritionistId })
    prisma.appointment.findFirst.mockResolvedValue(existing)
    prisma.appointment.delete.mockResolvedValue(existing)

    const { deleteAppointment } = await import('@/services/appointment.service')
    await deleteAppointment('appt-1', nutritionistId)

    expect(prisma.appointment.delete).toHaveBeenCalledWith({
      where: { id: 'appt-1' },
    })
  })

  it('throws when appointment is not found', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null)

    const { deleteAppointment } = await import('@/services/appointment.service')

    await expect(deleteAppointment('appt-1', nutritionistId)).rejects.toThrow(
      'Appointment not found'
    )
    expect(prisma.appointment.delete).not.toHaveBeenCalled()
  })
})

// ─── createAvailabilityRule ───────────────────────────────

describe('createAvailabilityRule', () => {
  it('creates an availability rule', async () => {
    const rule = buildAvailabilityRule()
    prisma.availabilityRule.create.mockResolvedValue(rule)

    const { createAvailabilityRule } = await import('@/services/appointment.service')
    const input = {
      dayOfWeek: 'MONDAY' as const,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 60,
    }
    const result = await createAvailabilityRule('nutri-1', input as never)

    expect(prisma.availabilityRule.create).toHaveBeenCalled()
    expect(result).toEqual(rule)
  })
})

// ─── listAvailabilityRules ────────────────────────────────

describe('listAvailabilityRules', () => {
  it('returns rules ordered by dayOfWeek and startTime', async () => {
    const rules = [
      buildAvailabilityRule({ dayOfWeek: 'MONDAY', startTime: '09:00' }),
      buildAvailabilityRule({ dayOfWeek: 'TUESDAY', startTime: '08:00' }),
    ]
    prisma.availabilityRule.findMany.mockResolvedValue(rules)

    const { listAvailabilityRules } = await import('@/services/appointment.service')
    const result = await listAvailabilityRules('nutri-1')

    expect(prisma.availabilityRule.findMany).toHaveBeenCalledWith({
      where: { nutritionistId: 'nutri-1' },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })
    expect(result).toEqual(rules)
  })
})

// ─── deleteAvailabilityRule ───────────────────────────────

describe('deleteAvailabilityRule', () => {
  const nutritionistId = 'nutri-1'

  it('deletes an existing availability rule', async () => {
    const rule = buildAvailabilityRule({ id: 'rule-1', nutritionistId })
    prisma.availabilityRule.findFirst.mockResolvedValue(rule)
    prisma.availabilityRule.delete.mockResolvedValue(rule)

    const { deleteAvailabilityRule } = await import('@/services/appointment.service')
    await deleteAvailabilityRule('rule-1', nutritionistId)

    expect(prisma.availabilityRule.delete).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
    })
  })

  it('throws when availability rule is not found', async () => {
    prisma.availabilityRule.findFirst.mockResolvedValue(null)

    const { deleteAvailabilityRule } = await import('@/services/appointment.service')

    await expect(deleteAvailabilityRule('rule-1', nutritionistId)).rejects.toThrow(
      'Availability rule not found'
    )
    expect(prisma.availabilityRule.delete).not.toHaveBeenCalled()
  })
})

// ─── getAvailableSlots ────────────────────────────────────

describe('getAvailableSlots', () => {
  const nutritionistId = 'nutri-1'
  // 2025-06-02 is a Monday (day index 1 => 'MONDAY')
  const date = '2025-06-02'

  it('generates correct slots and marks booked ones as unavailable', async () => {
    const rule = buildAvailabilityRule({
      startTime: '09:00',
      endTime: '12:00',
      slotDuration: 60,
      dayOfWeek: 'MONDAY',
      isActive: true,
    })

    prisma.availabilityRule.findMany.mockResolvedValue([rule])
    prisma.appointment.findMany.mockResolvedValue([
      {
        startsAt: new Date('2025-06-02T10:00:00'),
        endsAt: new Date('2025-06-02T11:00:00'),
      },
    ])

    const { getAvailableSlots } = await import('@/services/appointment.service')
    const slots = await getAvailableSlots(nutritionistId, date)

    expect(slots).toHaveLength(3)
    expect(slots[0]).toEqual({ startTime: '09:00', endTime: '10:00', available: true })
    expect(slots[1]).toEqual({ startTime: '10:00', endTime: '11:00', available: false })
    expect(slots[2]).toEqual({ startTime: '11:00', endTime: '12:00', available: true })
  })

  it('returns empty array when no availability rules exist', async () => {
    prisma.availabilityRule.findMany.mockResolvedValue([])

    const { getAvailableSlots } = await import('@/services/appointment.service')
    const slots = await getAvailableSlots(nutritionistId, date)

    expect(slots).toEqual([])
    expect(prisma.appointment.findMany).not.toHaveBeenCalled()
  })
})
