import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildConsultation, buildPatient, buildConsultationTemplate } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createConsultation
// ---------------------------------------------------------------------------
describe('createConsultation', () => {
  it('creates consultation with BMI calculation (80kg, 175cm => 26.12)', async () => {
    const patient = buildPatient({ weight: 80, height: 175 })
    const consultation = buildConsultation({ weight: 80, height: 175, bmi: 26.12 })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.consultation.create.mockResolvedValue(consultation)
    prisma.patient.update.mockResolvedValue(patient)
    prisma.weightEntry.create.mockResolvedValue({})

    const { createConsultation } = await import('@/services/consultation.service')
    const input = {
      patientId: patient.id,
      weight: 80,
      height: 175,
      chiefComplaint: 'Weight loss',
    }
    const result = await createConsultation('test-nutritionist-id', input as never)

    expect(result).toEqual(consultation)
    expect(prisma.consultation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bmi: 26.12,
          weight: 80,
          height: 175,
        }),
      }),
    )
  })

  it('creates a weight entry when weight is provided', async () => {
    const patient = buildPatient()
    const consultation = buildConsultation()

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.consultation.create.mockResolvedValue(consultation)
    prisma.patient.update.mockResolvedValue(patient)
    prisma.weightEntry.create.mockResolvedValue({})

    const { createConsultation } = await import('@/services/consultation.service')
    const input = { patientId: patient.id, weight: 80 }
    await createConsultation('test-nutritionist-id', input as never)

    expect(prisma.weightEntry.create).toHaveBeenCalledWith({
      data: {
        patientId: patient.id,
        weight: 80,
        notes: 'Recorded during consultation',
      },
    })
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: patient.id },
      data: { weight: 80, height: undefined },
    })
  })

  it('does not create weight entry when weight is not provided', async () => {
    const patient = buildPatient()
    const consultation = buildConsultation({ weight: null })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.consultation.create.mockResolvedValue(consultation)

    const { createConsultation } = await import('@/services/consultation.service')
    const input = { patientId: patient.id, chiefComplaint: 'Check-up' }
    await createConsultation('test-nutritionist-id', input as never)

    expect(prisma.weightEntry.create).not.toHaveBeenCalled()
    expect(prisma.patient.update).not.toHaveBeenCalled()
  })

  it('throws "Patient not found" when patient does not belong to nutritionist', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { createConsultation } = await import('@/services/consultation.service')
    const input = { patientId: 'unknown-id' }

    await expect(
      createConsultation('test-nutritionist-id', input as never),
    ).rejects.toThrow('Patient not found')
  })

  it('auto-generates title from patient name when title is not provided', async () => {
    const patient = buildPatient({ firstName: 'Maria', lastName: 'Silva' })
    const consultation = buildConsultation({ title: 'Consultation - Maria Silva' })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.consultation.create.mockResolvedValue(consultation)

    const { createConsultation } = await import('@/services/consultation.service')
    const input = { patientId: patient.id }
    await createConsultation('test-nutritionist-id', input as never)

    expect(prisma.consultation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Consultation - Maria Silva',
        }),
      }),
    )
  })

  it('uses provided title when given', async () => {
    const patient = buildPatient()
    const consultation = buildConsultation({ title: 'Custom Title' })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.consultation.create.mockResolvedValue(consultation)

    const { createConsultation } = await import('@/services/consultation.service')
    const input = { patientId: patient.id, title: 'Custom Title' }
    await createConsultation('test-nutritionist-id', input as never)

    expect(prisma.consultation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Custom Title',
        }),
      }),
    )
  })

  it('logs an audit entry on creation', async () => {
    const patient = buildPatient()
    const consultation = buildConsultation()

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.consultation.create.mockResolvedValue(consultation)

    const { createConsultation } = await import('@/services/consultation.service')
    const input = { patientId: patient.id, status: 'SCHEDULED' }
    await createConsultation('test-nutritionist-id', input as never)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-nutritionist-id',
      action: 'CREATE',
      entity: 'Consultation',
      entityId: consultation.id,
      details: { patientId: patient.id, status: 'SCHEDULED' },
    })
  })
})

// ---------------------------------------------------------------------------
// getConsultationById
// ---------------------------------------------------------------------------
describe('getConsultationById', () => {
  it('returns consultation by id and nutritionistId', async () => {
    const consultation = buildConsultation()
    prisma.consultation.findFirst.mockResolvedValue(consultation)

    const { getConsultationById } = await import('@/services/consultation.service')
    const result = await getConsultationById(consultation.id, 'test-nutritionist-id')

    expect(result).toEqual(consultation)
    expect(prisma.consultation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: consultation.id, nutritionistId: 'test-nutritionist-id' },
      }),
    )
  })

  it('returns null when consultation is not found', async () => {
    prisma.consultation.findFirst.mockResolvedValue(null)

    const { getConsultationById } = await import('@/services/consultation.service')
    const result = await getConsultationById('nonexistent', 'test-nutritionist-id')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateConsultation
// ---------------------------------------------------------------------------
describe('updateConsultation', () => {
  it('sets completedAt when transitioning to COMPLETED', async () => {
    const existing = buildConsultation({ status: 'SCHEDULED', completedAt: null })
    const updated = buildConsultation({ status: 'COMPLETED' })

    prisma.consultation.findFirst.mockResolvedValue(existing)
    prisma.consultation.update.mockResolvedValue(updated)

    const { updateConsultation } = await import('@/services/consultation.service')
    const result = await updateConsultation(existing.id, 'test-nutritionist-id', {
      status: 'COMPLETED',
    } as never)

    expect(result).toEqual(updated)
    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      }),
    })
  })

  it('does not change completedAt when already COMPLETED', async () => {
    const existing = buildConsultation({ status: 'COMPLETED' })
    const updated = buildConsultation({ status: 'COMPLETED', notes: 'Updated notes' })

    prisma.consultation.findFirst.mockResolvedValue(existing)
    prisma.consultation.update.mockResolvedValue(updated)

    const { updateConsultation } = await import('@/services/consultation.service')
    await updateConsultation(existing.id, 'test-nutritionist-id', {
      status: 'COMPLETED',
      notes: 'Updated notes',
    } as never)

    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        completedAt: undefined,
      }),
    })
  })

  it('throws "Consultation not found" when it does not exist', async () => {
    prisma.consultation.findFirst.mockResolvedValue(null)

    const { updateConsultation } = await import('@/services/consultation.service')

    await expect(
      updateConsultation('nonexistent', 'test-nutritionist-id', { notes: 'x' } as never),
    ).rejects.toThrow('Consultation not found')
  })

  it('logs an audit entry on update', async () => {
    const existing = buildConsultation({ status: 'SCHEDULED' })
    const updated = buildConsultation({ status: 'SCHEDULED', notes: 'new' })

    prisma.consultation.findFirst.mockResolvedValue(existing)
    prisma.consultation.update.mockResolvedValue(updated)

    const { updateConsultation } = await import('@/services/consultation.service')
    await updateConsultation(existing.id, 'test-nutritionist-id', { notes: 'new' } as never)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-nutritionist-id',
      action: 'UPDATE',
      entity: 'Consultation',
      entityId: existing.id,
      details: { updatedFields: ['notes'] },
    })
  })
})

// ---------------------------------------------------------------------------
// listConsultations
// ---------------------------------------------------------------------------
describe('listConsultations', () => {
  it('returns paginated consultations with defaults (page=1, perPage=20)', async () => {
    const consultations = [buildConsultation(), buildConsultation()]
    prisma.consultation.findMany.mockResolvedValue(consultations)
    prisma.consultation.count.mockResolvedValue(2)

    const { listConsultations } = await import('@/services/consultation.service')
    const result = await listConsultations('test-nutritionist-id', {})

    expect(result).toEqual({
      data: consultations,
      pagination: { page: 1, perPage: 20, total: 2, totalPages: 1 },
    })
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    )
  })

  it('applies patientId and status filters', async () => {
    prisma.consultation.findMany.mockResolvedValue([])
    prisma.consultation.count.mockResolvedValue(0)

    const { listConsultations } = await import('@/services/consultation.service')
    await listConsultations('test-nutritionist-id', {
      patientId: 'p-1',
      status: 'SCHEDULED',
      page: 2,
      perPage: 10,
    })

    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { nutritionistId: 'test-nutritionist-id', patientId: 'p-1', status: 'SCHEDULED' },
        skip: 10,
        take: 10,
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// deleteConsultation
// ---------------------------------------------------------------------------
describe('deleteConsultation', () => {
  it('deletes an existing consultation', async () => {
    const consultation = buildConsultation()
    prisma.consultation.findFirst.mockResolvedValue(consultation)
    prisma.consultation.delete.mockResolvedValue(consultation)

    const { deleteConsultation } = await import('@/services/consultation.service')
    await deleteConsultation(consultation.id, 'test-nutritionist-id')

    expect(prisma.consultation.delete).toHaveBeenCalledWith({
      where: { id: consultation.id },
    })
  })

  it('throws "Consultation not found" when it does not exist', async () => {
    prisma.consultation.findFirst.mockResolvedValue(null)

    const { deleteConsultation } = await import('@/services/consultation.service')

    await expect(
      deleteConsultation('nonexistent', 'test-nutritionist-id'),
    ).rejects.toThrow('Consultation not found')
  })

  it('logs an audit entry on deletion', async () => {
    const consultation = buildConsultation()
    prisma.consultation.findFirst.mockResolvedValue(consultation)
    prisma.consultation.delete.mockResolvedValue(consultation)

    const { deleteConsultation } = await import('@/services/consultation.service')
    await deleteConsultation(consultation.id, 'test-nutritionist-id')

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-nutritionist-id',
      action: 'DELETE',
      entity: 'Consultation',
      entityId: consultation.id,
    })
  })
})

// ---------------------------------------------------------------------------
// createTemplate
// ---------------------------------------------------------------------------
describe('createTemplate', () => {
  it('unsets existing defaults when isDefault is true', async () => {
    const template = buildConsultationTemplate({ isDefault: true })
    prisma.consultationTemplate.updateMany.mockResolvedValue({ count: 1 })
    prisma.consultationTemplate.create.mockResolvedValue(template)

    const { createTemplate } = await import('@/services/consultation.service')
    const input = { name: 'New Default', content: 'Content', isDefault: true }
    const result = await createTemplate('test-nutritionist-id', input as never)

    expect(prisma.consultationTemplate.updateMany).toHaveBeenCalledWith({
      where: { nutritionistId: 'test-nutritionist-id', isDefault: true },
      data: { isDefault: false },
    })
    expect(result).toEqual(template)
  })

  it('does not unset defaults when isDefault is false', async () => {
    const template = buildConsultationTemplate({ isDefault: false })
    prisma.consultationTemplate.create.mockResolvedValue(template)

    const { createTemplate } = await import('@/services/consultation.service')
    const input = { name: 'Regular Template', content: 'Content', isDefault: false }
    await createTemplate('test-nutritionist-id', input as never)

    expect(prisma.consultationTemplate.updateMany).not.toHaveBeenCalled()
  })

  it('creates template with nutritionistId', async () => {
    const template = buildConsultationTemplate()
    prisma.consultationTemplate.create.mockResolvedValue(template)

    const { createTemplate } = await import('@/services/consultation.service')
    const input = { name: 'My Template', content: 'Content', isDefault: false }
    await createTemplate('test-nutritionist-id', input as never)

    expect(prisma.consultationTemplate.create).toHaveBeenCalledWith({
      data: {
        name: 'My Template',
        content: 'Content',
        isDefault: false,
        nutritionistId: 'test-nutritionist-id',
      },
    })
  })
})

// ---------------------------------------------------------------------------
// listTemplates
// ---------------------------------------------------------------------------
describe('listTemplates', () => {
  it('returns templates ordered by isDefault desc then name asc', async () => {
    const templates = [
      buildConsultationTemplate({ isDefault: true, name: 'A Template' }),
      buildConsultationTemplate({ isDefault: false, name: 'B Template' }),
    ]
    prisma.consultationTemplate.findMany.mockResolvedValue(templates)

    const { listTemplates } = await import('@/services/consultation.service')
    const result = await listTemplates('test-nutritionist-id')

    expect(result).toEqual(templates)
    expect(prisma.consultationTemplate.findMany).toHaveBeenCalledWith({
      where: { nutritionistId: 'test-nutritionist-id' },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  })
})

// ---------------------------------------------------------------------------
// getTemplateById
// ---------------------------------------------------------------------------
describe('getTemplateById', () => {
  it('returns template by id and nutritionistId', async () => {
    const template = buildConsultationTemplate()
    prisma.consultationTemplate.findFirst.mockResolvedValue(template)

    const { getTemplateById } = await import('@/services/consultation.service')
    const result = await getTemplateById(template.id, 'test-nutritionist-id')

    expect(result).toEqual(template)
    expect(prisma.consultationTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: template.id, nutritionistId: 'test-nutritionist-id' },
    })
  })

  it('returns null when template is not found', async () => {
    prisma.consultationTemplate.findFirst.mockResolvedValue(null)

    const { getTemplateById } = await import('@/services/consultation.service')
    const result = await getTemplateById('nonexistent', 'test-nutritionist-id')

    expect(result).toBeNull()
  })
})
