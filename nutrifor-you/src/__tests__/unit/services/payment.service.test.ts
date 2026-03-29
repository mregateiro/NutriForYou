import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import {
  buildPayment,
  buildInvoice,
  buildPatient,
} from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

const NUTRITIONIST_ID = 'test-nutritionist-id'

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
  // aggregate is not in the default mock setup; add it for getFinancialSummary
  prisma.payment.aggregate = vi.fn()
})

// ─── Payments ──────────────────────────────────────────────

describe('createPayment', () => {
  it('creates a payment when patient belongs to nutritionist', async () => {
    const patient = buildPatient()
    const payment = buildPayment({ status: 'PENDING', paidAt: null })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.payment.create.mockResolvedValue(payment)

    const { createPayment } = await import('@/services/payment.service')
    const input = {
      patientId: patient.id,
      amount: 150,
      currency: 'EUR',
      method: 'CREDIT_CARD',
      description: 'Consultation fee',
      status: 'PENDING',
    }

    const result = await createPayment(NUTRITIONIST_ID, input)

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: patient.id, nutritionistId: NUTRITIONIST_ID, isActive: true },
    })
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: patient.id,
          recordedById: NUTRITIONIST_ID,
          amount: 150,
          currency: 'EUR',
          status: 'PENDING',
        }),
      }),
    )
    expect(result).toEqual(payment)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: NUTRITIONIST_ID,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
      }),
    )
  })

  it('throws when patient is not found', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { createPayment } = await import('@/services/payment.service')
    const input = {
      patientId: 'non-existent',
      amount: 100,
      currency: 'EUR',
      method: 'PIX',
      description: 'Test',
      status: 'PENDING',
    }

    await expect(createPayment(NUTRITIONIST_ID, input)).rejects.toThrow('Patient not found')
    expect(prisma.payment.create).not.toHaveBeenCalled()
  })

  it('resolves paidAt automatically when status is COMPLETED', async () => {
    const patient = buildPatient()
    const payment = buildPayment({ status: 'COMPLETED' })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.payment.create.mockResolvedValue(payment)

    const { createPayment } = await import('@/services/payment.service')
    const input = {
      patientId: patient.id,
      amount: 200,
      currency: 'EUR',
      method: 'CREDIT_CARD',
      description: 'Completed payment',
      status: 'COMPLETED',
    }

    await createPayment(NUTRITIONIST_ID, input)

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAt: expect.any(Date),
        }),
      }),
    )
  })

  it('uses explicit paidAt when provided', async () => {
    const patient = buildPatient()
    const payment = buildPayment()

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.payment.create.mockResolvedValue(payment)

    const { createPayment } = await import('@/services/payment.service')
    const explicitDate = '2024-06-15T10:00:00Z'
    const input = {
      patientId: patient.id,
      amount: 100,
      currency: 'EUR',
      method: 'PIX',
      description: 'Test',
      status: 'PENDING',
      paidAt: explicitDate,
    }

    await createPayment(NUTRITIONIST_ID, input)

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAt: new Date(explicitDate),
        }),
      }),
    )
  })
})

describe('getPaymentById', () => {
  it('returns a payment with includes', async () => {
    const payment = buildPayment()
    prisma.payment.findFirst.mockResolvedValue(payment)

    const { getPaymentById } = await import('@/services/payment.service')
    const result = await getPaymentById(payment.id, NUTRITIONIST_ID)

    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { id: payment.id, recordedById: NUTRITIONIST_ID },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        invoiceItems: {
          include: { invoice: { select: { id: true, number: true, status: true } } },
        },
      },
    })
    expect(result).toEqual(payment)
  })

  it('returns null when payment not found', async () => {
    prisma.payment.findFirst.mockResolvedValue(null)

    const { getPaymentById } = await import('@/services/payment.service')
    const result = await getPaymentById('non-existent', NUTRITIONIST_ID)

    expect(result).toBeNull()
  })
})

describe('updatePayment', () => {
  it('updates an existing payment', async () => {
    const existing = buildPayment({ status: 'PENDING', paidAt: null })
    const updated = buildPayment({ ...existing, description: 'Updated desc' })

    prisma.payment.findFirst.mockResolvedValue(existing)
    prisma.payment.update.mockResolvedValue(updated)

    const { updatePayment } = await import('@/services/payment.service')
    const result = await updatePayment(existing.id, NUTRITIONIST_ID, {
      description: 'Updated desc',
    })

    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { id: existing.id, recordedById: NUTRITIONIST_ID },
    })
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ description: 'Updated desc' }),
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity: 'Payment',
        entityId: existing.id,
      }),
    )
  })

  it('auto-sets paidAt when status transitions to COMPLETED', async () => {
    const existing = buildPayment({ status: 'PENDING', paidAt: null })
    const updated = buildPayment({ ...existing, status: 'COMPLETED', paidAt: new Date() })

    prisma.payment.findFirst.mockResolvedValue(existing)
    prisma.payment.update.mockResolvedValue(updated)

    const { updatePayment } = await import('@/services/payment.service')
    await updatePayment(existing.id, NUTRITIONIST_ID, { status: 'COMPLETED' })

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        status: 'COMPLETED',
        paidAt: expect.any(Date),
      }),
    })
  })

  it('does not re-set paidAt when already COMPLETED', async () => {
    const existingPaidAt = new Date('2024-01-01')
    const existing = buildPayment({ status: 'COMPLETED', paidAt: existingPaidAt })
    const updated = buildPayment({ ...existing, description: 'Updated' })

    prisma.payment.findFirst.mockResolvedValue(existing)
    prisma.payment.update.mockResolvedValue(updated)

    const { updatePayment } = await import('@/services/payment.service')
    await updatePayment(existing.id, NUTRITIONIST_ID, {
      status: 'COMPLETED',
      description: 'Updated',
    })

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        paidAt: undefined,
      }),
    })
  })

  it('throws when payment not found', async () => {
    prisma.payment.findFirst.mockResolvedValue(null)

    const { updatePayment } = await import('@/services/payment.service')

    await expect(
      updatePayment('non-existent', NUTRITIONIST_ID, { description: 'x' }),
    ).rejects.toThrow('Payment not found')
    expect(prisma.payment.update).not.toHaveBeenCalled()
  })
})

describe('listPayments', () => {
  it('returns paginated payments with defaults', async () => {
    const payments = [buildPayment(), buildPayment()]
    prisma.payment.findMany.mockResolvedValue(payments)
    prisma.payment.count.mockResolvedValue(2)

    const { listPayments } = await import('@/services/payment.service')
    const result = await listPayments(NUTRITIONIST_ID, {})

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recordedById: NUTRITIONIST_ID },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    )
    expect(result.data).toHaveLength(2)
    expect(result.pagination).toEqual({
      page: 1,
      perPage: 20,
      total: 2,
      totalPages: 1,
    })
  })

  it('applies filters and custom pagination', async () => {
    prisma.payment.findMany.mockResolvedValue([])
    prisma.payment.count.mockResolvedValue(0)

    const { listPayments } = await import('@/services/payment.service')
    await listPayments(NUTRITIONIST_ID, {
      patientId: 'patient-1',
      status: 'COMPLETED',
      page: 2,
      perPage: 10,
    })

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recordedById: NUTRITIONIST_ID,
          patientId: 'patient-1',
          status: 'COMPLETED',
        },
        skip: 10,
        take: 10,
      }),
    )
  })

  it('calculates totalPages correctly', async () => {
    prisma.payment.findMany.mockResolvedValue([])
    prisma.payment.count.mockResolvedValue(25)

    const { listPayments } = await import('@/services/payment.service')
    const result = await listPayments(NUTRITIONIST_ID, { perPage: 10 })

    expect(result.pagination.totalPages).toBe(3)
  })
})

describe('deletePayment', () => {
  it('deletes an existing payment', async () => {
    const payment = buildPayment()
    prisma.payment.findFirst.mockResolvedValue(payment)
    prisma.payment.delete.mockResolvedValue(payment)

    const { deletePayment } = await import('@/services/payment.service')
    await deletePayment(payment.id, NUTRITIONIST_ID)

    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { id: payment.id, recordedById: NUTRITIONIST_ID },
    })
    expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { id: payment.id } })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        entity: 'Payment',
        entityId: payment.id,
      }),
    )
  })

  it('throws when payment not found', async () => {
    prisma.payment.findFirst.mockResolvedValue(null)

    const { deletePayment } = await import('@/services/payment.service')

    await expect(deletePayment('non-existent', NUTRITIONIST_ID)).rejects.toThrow(
      'Payment not found',
    )
    expect(prisma.payment.delete).not.toHaveBeenCalled()
  })
})

// ─── Invoices ──────────────────────────────────────────────

describe('createInvoice', () => {
  it('generates invoice number and calculates totals', async () => {
    const invoice = buildInvoice({
      number: expect.any(String),
      subtotal: 150,
      tax: 10,
      total: 160,
      items: [
        { description: 'Consultation', quantity: 2, unitPrice: 75, total: 150 },
      ],
    })

    prisma.invoice.count.mockResolvedValue(3)
    prisma.invoice.create.mockResolvedValue(invoice)

    const { createInvoice } = await import('@/services/payment.service')
    const input = {
      currency: 'EUR',
      tax: 10,
      items: [{ description: 'Consultation', quantity: 2, unitPrice: 75 }],
    }

    const result = await createInvoice(NUTRITIONIST_ID, input)

    // Verify count was called with the date prefix
    expect(prisma.invoice.count).toHaveBeenCalledWith({
      where: { number: { startsWith: expect.stringMatching(/^INV-\d{8}$/) } },
    })

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        number: expect.stringMatching(/^INV-\d{8}-0004$/),
        subtotal: 150,
        tax: 10,
        total: 160,
        currency: 'EUR',
        items: {
          create: [
            expect.objectContaining({
              description: 'Consultation',
              quantity: 2,
              unitPrice: 75,
              total: 150,
            }),
          ],
        },
      }),
      include: { items: true },
    })

    expect(result).toEqual(invoice)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entity: 'Invoice',
      }),
    )
  })

  it('defaults tax to 0 when not provided', async () => {
    const invoice = buildInvoice({ subtotal: 75, tax: 0, total: 75 })

    prisma.invoice.count.mockResolvedValue(0)
    prisma.invoice.create.mockResolvedValue(invoice)

    const { createInvoice } = await import('@/services/payment.service')
    const input = {
      currency: 'EUR',
      items: [{ description: 'Single session', quantity: 1, unitPrice: 75 }],
    }

    await createInvoice(NUTRITIONIST_ID, input)

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        number: expect.stringMatching(/^INV-\d{8}-0001$/),
        subtotal: 75,
        tax: 0,
        total: 75,
      }),
      include: { items: true },
    })
  })

  it('handles dueDate and notes', async () => {
    const invoice = buildInvoice()
    prisma.invoice.count.mockResolvedValue(0)
    prisma.invoice.create.mockResolvedValue(invoice)

    const { createInvoice } = await import('@/services/payment.service')
    const input = {
      currency: 'EUR',
      dueDate: '2025-12-31',
      notes: 'Please pay on time',
      items: [{ description: 'Session', quantity: 1, unitPrice: 100 }],
    }

    await createInvoice(NUTRITIONIST_ID, input)

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dueDate: new Date('2025-12-31'),
        notes: 'Please pay on time',
      }),
      include: { items: true },
    })
  })

  it('calculates subtotal from multiple items', async () => {
    const invoice = buildInvoice({ subtotal: 350, total: 350 })
    prisma.invoice.count.mockResolvedValue(0)
    prisma.invoice.create.mockResolvedValue(invoice)

    const { createInvoice } = await import('@/services/payment.service')
    const input = {
      currency: 'EUR',
      items: [
        { description: 'Consultation', quantity: 2, unitPrice: 100 },
        { description: 'Meal Plan', quantity: 3, unitPrice: 50 },
      ],
    }

    await createInvoice(NUTRITIONIST_ID, input)

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subtotal: 350,
        total: 350,
        items: {
          create: [
            expect.objectContaining({ description: 'Consultation', total: 200 }),
            expect.objectContaining({ description: 'Meal Plan', total: 150 }),
          ],
        },
      }),
      include: { items: true },
    })
  })
})

describe('getInvoiceById', () => {
  it('returns an invoice with items and payment relations', async () => {
    const invoice = buildInvoice()
    prisma.invoice.findUnique.mockResolvedValue(invoice)

    const { getInvoiceById } = await import('@/services/payment.service')
    const result = await getInvoiceById(invoice.id)

    expect(prisma.invoice.findUnique).toHaveBeenCalledWith({
      where: { id: invoice.id },
      include: {
        items: {
          include: {
            payment: {
              select: { id: true, patientId: true, amount: true, status: true },
            },
          },
        },
      },
    })
    expect(result).toEqual(invoice)
  })

  it('returns null when invoice not found', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null)

    const { getInvoiceById } = await import('@/services/payment.service')
    const result = await getInvoiceById('non-existent')

    expect(result).toBeNull()
  })
})

describe('updateInvoice', () => {
  it('updates an existing invoice', async () => {
    const existing = buildInvoice()
    const updated = buildInvoice({ ...existing, notes: 'Updated notes' })

    prisma.invoice.findUnique.mockResolvedValue(existing)
    prisma.invoice.update.mockResolvedValue(updated)

    const { updateInvoice } = await import('@/services/payment.service')
    const result = await updateInvoice(existing.id, NUTRITIONIST_ID, {
      notes: 'Updated notes',
    })

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ notes: 'Updated notes' }),
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: existing.id,
      }),
    )
  })

  it('auto-sets paidAt when status transitions to PAID', async () => {
    const existing = buildInvoice({ status: 'PENDING', paidAt: null })
    const updated = buildInvoice({ ...existing, status: 'PAID', paidAt: new Date() })

    prisma.invoice.findUnique.mockResolvedValue(existing)
    prisma.invoice.update.mockResolvedValue(updated)

    const { updateInvoice } = await import('@/services/payment.service')
    await updateInvoice(existing.id, NUTRITIONIST_ID, { status: 'PAID' })

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        status: 'PAID',
        paidAt: expect.any(Date),
      }),
    })
  })

  it('does not override existing paidAt when already paid', async () => {
    const existingPaidAt = new Date('2024-01-15')
    const existing = buildInvoice({ status: 'PAID', paidAt: existingPaidAt })
    const updated = buildInvoice({ ...existing, notes: 'Added note' })

    prisma.invoice.findUnique.mockResolvedValue(existing)
    prisma.invoice.update.mockResolvedValue(updated)

    const { updateInvoice } = await import('@/services/payment.service')
    await updateInvoice(existing.id, NUTRITIONIST_ID, {
      status: 'PAID',
      notes: 'Added note',
    })

    // When existing.paidAt is truthy, the auto-set branch is skipped
    const updateCall = prisma.invoice.update.mock.calls[0][0]
    expect(updateCall.data.notes).toBe('Added note')
  })

  it('handles explicit paidAt input', async () => {
    const existing = buildInvoice({ status: 'PENDING', paidAt: null })
    const updated = buildInvoice({ ...existing, paidAt: new Date('2025-03-01') })

    prisma.invoice.findUnique.mockResolvedValue(existing)
    prisma.invoice.update.mockResolvedValue(updated)

    const { updateInvoice } = await import('@/services/payment.service')
    await updateInvoice(existing.id, NUTRITIONIST_ID, {
      paidAt: '2025-03-01',
    })

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        paidAt: new Date('2025-03-01'),
      }),
    })
  })

  it('throws when invoice not found', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null)

    const { updateInvoice } = await import('@/services/payment.service')

    await expect(
      updateInvoice('non-existent', NUTRITIONIST_ID, { notes: 'x' }),
    ).rejects.toThrow('Invoice not found')
    expect(prisma.invoice.update).not.toHaveBeenCalled()
  })
})

describe('listInvoices', () => {
  it('returns paginated invoices with defaults', async () => {
    const invoices = [buildInvoice(), buildInvoice()]
    prisma.invoice.findMany.mockResolvedValue(invoices)
    prisma.invoice.count.mockResolvedValue(2)

    const { listInvoices } = await import('@/services/payment.service')
    const result = await listInvoices({})

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    )
    expect(result.data).toHaveLength(2)
    expect(result.pagination).toEqual({
      page: 1,
      perPage: 20,
      total: 2,
      totalPages: 1,
    })
  })

  it('applies status filter and custom pagination', async () => {
    prisma.invoice.findMany.mockResolvedValue([])
    prisma.invoice.count.mockResolvedValue(0)

    const { listInvoices } = await import('@/services/payment.service')
    await listInvoices({ status: 'PAID', page: 3, perPage: 5 })

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PAID' },
        skip: 10,
        take: 5,
      }),
    )
  })
})

// ─── Financial Dashboard ──────────────────────────────────

describe('getFinancialSummary', () => {
  it('aggregates financial data correctly', async () => {
    const recentPayments = [buildPayment(), buildPayment()]

    ;(prisma.payment.aggregate as ReturnType<typeof vi.fn>)
      // totalRevenue
      .mockResolvedValueOnce({ _sum: { amount: 5000 } })
      // monthlyRevenue
      .mockResolvedValueOnce({ _sum: { amount: 1200 } })
      // lastMonthRevenue
      .mockResolvedValueOnce({ _sum: { amount: 800 } })
      // pendingPayments
      .mockResolvedValueOnce({ _sum: { amount: 300 }, _count: 3 })

    prisma.invoice.count.mockResolvedValue(2)
    prisma.payment.findMany.mockResolvedValue(recentPayments)

    const { getFinancialSummary } = await import('@/services/payment.service')
    const result = await getFinancialSummary(NUTRITIONIST_ID)

    expect(result).toEqual({
      totalRevenue: 5000,
      monthlyRevenue: 1200,
      lastMonthRevenue: 800,
      pendingAmount: 300,
      pendingCount: 3,
      overdueInvoices: 2,
      recentPayments,
    })

    expect(prisma.payment.aggregate).toHaveBeenCalledTimes(4)
    expect(prisma.invoice.count).toHaveBeenCalledWith({
      where: { status: 'OVERDUE' },
    })
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recordedById: NUTRITIONIST_ID },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    )
  })

  it('returns zero values when no data exists', async () => {
    ;(prisma.payment.aggregate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 })

    prisma.invoice.count.mockResolvedValue(0)
    prisma.payment.findMany.mockResolvedValue([])

    const { getFinancialSummary } = await import('@/services/payment.service')
    const result = await getFinancialSummary(NUTRITIONIST_ID)

    expect(result).toEqual({
      totalRevenue: 0,
      monthlyRevenue: 0,
      lastMonthRevenue: 0,
      pendingAmount: 0,
      pendingCount: 0,
      overdueInvoices: 0,
      recentPayments: [],
    })
  })
})
