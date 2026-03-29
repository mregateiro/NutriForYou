import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildPatient } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createPatient
// ---------------------------------------------------------------------------
describe('createPatient', () => {
  it('creates patient, converts dateOfBirth and logs audit', async () => {
    const patient = buildPatient()
    prisma.patient.create.mockResolvedValue(patient)

    const { createPatient } = await import('@/services/patient.service')
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-15',
      email: 'john@example.com',
    }
    const result = await createPatient('nutri-1', input as never)

    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: {
        ...input,
        email: 'john@example.com',
        dateOfBirth: new Date('1990-01-15'),
        nutritionistId: 'nutri-1',
      },
    })
    expect(result).toEqual(patient)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'nutri-1',
      action: 'CREATE',
      entity: 'Patient',
      entityId: patient.id,
      details: { firstName: patient.firstName, lastName: patient.lastName },
    })
  })

  it('handles input without dateOfBirth', async () => {
    const patient = buildPatient({ dateOfBirth: null })
    prisma.patient.create.mockResolvedValue(patient)

    const { createPatient } = await import('@/services/patient.service')
    const input = { firstName: 'Jane', lastName: 'Doe' }
    await createPatient('nutri-1', input as never)

    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dateOfBirth: undefined }),
    })
  })

  it('handles input without email', async () => {
    const patient = buildPatient({ email: null })
    prisma.patient.create.mockResolvedValue(patient)

    const { createPatient } = await import('@/services/patient.service')
    const input = { firstName: 'Jane', lastName: 'Doe', email: '' }
    await createPatient('nutri-1', input as never)

    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: undefined }),
    })
  })
})

// ---------------------------------------------------------------------------
// getPatientById
// ---------------------------------------------------------------------------
describe('getPatientById', () => {
  it('returns patient with weight entries and counts', async () => {
    const patient = buildPatient({
      weightEntries: [{ id: 'w1', weight: 80, recordedAt: new Date() }],
      _count: { consultations: 2, mealPlans: 1, documents: 0, appointments: 3 },
    })
    prisma.patient.findFirst.mockResolvedValue(patient)

    const { getPatientById } = await import('@/services/patient.service')
    const result = await getPatientById('patient-1', 'nutri-1')

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'patient-1', nutritionistId: 'nutri-1', isActive: true },
      include: {
        weightEntries: { orderBy: { recordedAt: 'desc' }, take: 10 },
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
    expect(result).toEqual(patient)
  })

  it('returns null when patient is not found', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { getPatientById } = await import('@/services/patient.service')
    const result = await getPatientById('missing-id', 'nutri-1')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updatePatient
// ---------------------------------------------------------------------------
describe('updatePatient', () => {
  it('verifies ownership, updates patient and creates audit log', async () => {
    const existing = buildPatient({ id: 'p-1' })
    const updated = { ...existing, firstName: 'Updated' }
    prisma.patient.findFirst.mockResolvedValue(existing)
    prisma.patient.update.mockResolvedValue(updated)

    const { updatePatient } = await import('@/services/patient.service')
    const input = { firstName: 'Updated', dateOfBirth: '1995-06-20', email: 'new@example.com' }
    const result = await updatePatient('p-1', 'nutri-1', input as never)

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'p-1', nutritionistId: 'nutri-1', isActive: true },
    })
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: {
        ...input,
        email: 'new@example.com',
        dateOfBirth: new Date('1995-06-20'),
      },
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'nutri-1',
      action: 'UPDATE',
      entity: 'Patient',
      entityId: 'p-1',
      details: { updatedFields: ['firstName', 'dateOfBirth', 'email'] },
    })
  })

  it('throws "Patient not found" when patient does not exist', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { updatePatient } = await import('@/services/patient.service')
    await expect(
      updatePatient('missing', 'nutri-1', { firstName: 'X' } as never)
    ).rejects.toThrow('Patient not found')

    expect(prisma.patient.update).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// deletePatient
// ---------------------------------------------------------------------------
describe('deletePatient', () => {
  it('soft-deletes patient setting isActive=false and deletedAt', async () => {
    const existing = buildPatient({ id: 'p-1' })
    prisma.patient.findFirst.mockResolvedValue(existing)
    prisma.patient.update.mockResolvedValue({ ...existing, isActive: false })

    const { deletePatient } = await import('@/services/patient.service')
    await deletePatient('p-1', 'nutri-1')

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'p-1', nutritionistId: 'nutri-1', isActive: true },
    })
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { isActive: false, deletedAt: expect.any(Date) },
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'nutri-1',
      action: 'DELETE',
      entity: 'Patient',
      entityId: 'p-1',
    })
  })

  it('throws "Patient not found" when patient does not exist', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { deletePatient } = await import('@/services/patient.service')
    await expect(deletePatient('missing', 'nutri-1')).rejects.toThrow('Patient not found')

    expect(prisma.patient.update).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// searchPatients
// ---------------------------------------------------------------------------
describe('searchPatients', () => {
  it('returns paginated patients without query filter', async () => {
    const patients = [buildPatient(), buildPatient()]
    prisma.patient.findMany.mockResolvedValue(patients)
    prisma.patient.count.mockResolvedValue(2)

    const { searchPatients } = await import('@/services/patient.service')
    const result = await searchPatients('nutri-1', {
      page: 1,
      perPage: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as never)

    const expectedWhere = { nutritionistId: 'nutri-1', isActive: true }
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    )
    expect(prisma.patient.count).toHaveBeenCalledWith({ where: expectedWhere })
    expect(result.data).toEqual(patients)
    expect(result.pagination).toEqual({
      page: 1,
      perPage: 10,
      total: 2,
      totalPages: 1,
    })
  })

  it('adds OR clause for case-insensitive search when query is present', async () => {
    prisma.patient.findMany.mockResolvedValue([])
    prisma.patient.count.mockResolvedValue(0)

    const { searchPatients } = await import('@/services/patient.service')
    await searchPatients('nutri-1', {
      query: 'john',
      page: 1,
      perPage: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as never)

    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          nutritionistId: 'nutri-1',
          isActive: true,
          OR: [
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { phone: { contains: 'john' } },
          ],
        },
      })
    )
  })

  it('calculates pagination correctly for multiple pages', async () => {
    prisma.patient.findMany.mockResolvedValue([])
    prisma.patient.count.mockResolvedValue(25)

    const { searchPatients } = await import('@/services/patient.service')
    const result = await searchPatients('nutri-1', {
      page: 3,
      perPage: 10,
      sortBy: 'firstName',
      sortOrder: 'asc',
    } as never)

    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { firstName: 'asc' },
        skip: 20,
        take: 10,
      })
    )
    expect(result.pagination).toEqual({
      page: 3,
      perPage: 10,
      total: 25,
      totalPages: 3,
    })
  })
})

// ---------------------------------------------------------------------------
// getPatientTimeline
// ---------------------------------------------------------------------------
describe('getPatientTimeline', () => {
  it('fetches all entities and merges into timeline sorted by date desc', async () => {
    const patient = buildPatient({ id: 'p-1' })
    prisma.patient.findFirst.mockResolvedValue(patient)

    const dates = {
      consultation: new Date('2024-03-01'),
      appointment: new Date('2024-03-05'),
      document: new Date('2024-02-20'),
      mealPlan: new Date('2024-03-03'),
      weightEntry: new Date('2024-03-04'),
    }

    prisma.consultation.findMany.mockResolvedValue([
      { id: 'c1', title: 'Follow-up', status: 'COMPLETED', createdAt: dates.consultation },
    ])
    prisma.appointment.findMany.mockResolvedValue([
      { id: 'a1', title: 'Check-in', status: 'SCHEDULED', startsAt: dates.appointment },
    ])
    prisma.document.findMany.mockResolvedValue([
      { id: 'd1', fileName: 'report.pdf', type: 'LAB_RESULT', createdAt: dates.document },
    ])
    prisma.mealPlan.findMany.mockResolvedValue([
      { id: 'm1', title: 'Week Plan', status: 'ACTIVE', createdAt: dates.mealPlan },
    ])
    prisma.weightEntry.findMany.mockResolvedValue([
      { id: 'w1', weight: 78, recordedAt: dates.weightEntry },
    ])

    const { getPatientTimeline } = await import('@/services/patient.service')
    const timeline = await getPatientTimeline('p-1', 'nutri-1')

    // Verify ownership check
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'p-1', nutritionistId: 'nutri-1', isActive: true },
    })

    // All 5 findMany calls should have been made
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'p-1' } })
    )
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'p-1' } })
    )
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'p-1' } })
    )
    expect(prisma.mealPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'p-1' } })
    )
    expect(prisma.weightEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'p-1' } })
    )

    // Timeline should be sorted by date descending
    expect(timeline).toHaveLength(5)
    expect(timeline[0]).toMatchObject({ id: 'a1', type: 'appointment', date: dates.appointment })
    expect(timeline[1]).toMatchObject({ id: 'w1', type: 'weight_entry', date: dates.weightEntry })
    expect(timeline[2]).toMatchObject({ id: 'm1', type: 'meal_plan', date: dates.mealPlan })
    expect(timeline[3]).toMatchObject({ id: 'c1', type: 'consultation', date: dates.consultation })
    expect(timeline[4]).toMatchObject({ id: 'd1', type: 'document', date: dates.document })
  })

  it('returns empty timeline when patient has no records', async () => {
    const patient = buildPatient({ id: 'p-2' })
    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.consultation.findMany.mockResolvedValue([])
    prisma.appointment.findMany.mockResolvedValue([])
    prisma.document.findMany.mockResolvedValue([])
    prisma.mealPlan.findMany.mockResolvedValue([])
    prisma.weightEntry.findMany.mockResolvedValue([])

    const { getPatientTimeline } = await import('@/services/patient.service')
    const timeline = await getPatientTimeline('p-2', 'nutri-1')

    expect(timeline).toEqual([])
  })

  it('throws "Patient not found" when patient does not exist', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { getPatientTimeline } = await import('@/services/patient.service')
    await expect(getPatientTimeline('missing', 'nutri-1')).rejects.toThrow('Patient not found')

    expect(prisma.consultation.findMany).not.toHaveBeenCalled()
  })
})
