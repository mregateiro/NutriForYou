import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreatePaymentInput, UpdatePaymentInput, CreateInvoiceInput, UpdateInvoiceInput } from '@/validators/payment.schema'

// ─── Payments ──────────────────────────────────────────────

export async function createPayment(
  recordedById: string,
  input: CreatePaymentInput
) {
  // Verify patient belongs to nutritionist
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, nutritionistId: recordedById, isActive: true },
  })
  if (!patient) throw new Error('Patient not found')

  const payment = await prisma.payment.create({
    data: {
      patientId: input.patientId,
      recordedById,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      description: input.description,
      status: input.status,
      paidAt: input.paidAt ? new Date(input.paidAt) : input.status === 'COMPLETED' ? new Date() : undefined,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  await createAuditLog({
    userId: recordedById,
    action: AuditAction.CREATE,
    entity: 'Payment',
    entityId: payment.id,
    details: { patientId: input.patientId, amount: input.amount, currency: input.currency },
  })

  logger.info({ paymentId: payment.id, recordedById }, 'Payment created')
  return payment
}

export async function getPaymentById(id: string, recordedById: string) {
  return prisma.payment.findFirst({
    where: { id, recordedById },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      invoiceItems: {
        include: { invoice: { select: { id: true, number: true, status: true } } },
      },
    },
  })
}

export async function updatePayment(
  id: string,
  recordedById: string,
  input: UpdatePaymentInput
) {
  const existing = await prisma.payment.findFirst({
    where: { id, recordedById },
  })
  if (!existing) throw new Error('Payment not found')

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      ...input,
      paidAt: input.paidAt ? new Date(input.paidAt)
        : input.status === 'COMPLETED' && existing.status !== 'COMPLETED' ? new Date()
        : undefined,
    },
  })

  await createAuditLog({
    userId: recordedById,
    action: AuditAction.UPDATE,
    entity: 'Payment',
    entityId: id,
    details: { updatedFields: Object.keys(input) },
  })

  return payment
}

export async function listPayments(
  recordedById: string,
  params: {
    patientId?: string
    status?: string
    page?: number
    perPage?: number
  }
) {
  const { page = 1, perPage = 20, patientId, status } = params
  const where: Record<string, unknown> = { recordedById }

  if (patientId) where.patientId = patientId
  if (status) where.status = status

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.payment.count({ where }),
  ])

  return {
    data: payments,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function deletePayment(id: string, recordedById: string) {
  const existing = await prisma.payment.findFirst({
    where: { id, recordedById },
  })
  if (!existing) throw new Error('Payment not found')

  await prisma.payment.delete({ where: { id } })

  await createAuditLog({
    userId: recordedById,
    action: AuditAction.DELETE,
    entity: 'Payment',
    entityId: id,
  })

  logger.info({ paymentId: id, recordedById }, 'Payment deleted')
}

// ─── Invoices ──────────────────────────────────────────────

export async function createInvoice(
  userId: string,
  input: CreateInvoiceInput
) {
  // Generate invoice number: INV-YYYYMMDD-XXXX
  const today = new Date()
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const count = await prisma.invoice.count({
    where: { number: { startsWith: prefix } },
  })
  const number = `${prefix}-${String(count + 1).padStart(4, '0')}`

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const total = subtotal + (input.tax || 0)

  const invoice = await prisma.invoice.create({
    data: {
      number,
      subtotal,
      tax: input.tax || 0,
      total,
      currency: input.currency,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      notes: input.notes,
      items: {
        create: input.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          paymentId: item.paymentId,
        })),
      },
    },
    include: {
      items: true,
    },
  })

  await createAuditLog({
    userId,
    action: AuditAction.CREATE,
    entity: 'Invoice',
    entityId: invoice.id,
    details: { number: invoice.number, total: invoice.total },
  })

  logger.info({ invoiceId: invoice.id, number: invoice.number }, 'Invoice created')
  return invoice
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
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
}

export async function updateInvoice(
  id: string,
  userId: string,
  input: UpdateInvoiceInput
) {
  const existing = await prisma.invoice.findUnique({ where: { id } })
  if (!existing) throw new Error('Invoice not found')

  const data: Record<string, unknown> = {}
  if (input.status) data.status = input.status
  if (input.dueDate) data.dueDate = new Date(input.dueDate)
  if (input.notes !== undefined) data.notes = input.notes
  if (input.paidAt) data.paidAt = new Date(input.paidAt)
  if (input.status === 'PAID' && !existing.paidAt) {
    data.paidAt = new Date()
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data,
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'Invoice',
    entityId: id,
    details: { updatedFields: Object.keys(input) },
  })

  return invoice
}

export async function listInvoices(
  params: {
    status?: string
    page?: number
    perPage?: number
  }
) {
  const { page = 1, perPage = 20, status } = params
  const where: Record<string, unknown> = {}

  if (status) where.status = status

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        items: {
          select: { id: true, description: true, total: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    data: invoices,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

// ─── Financial Dashboard ──────────────────────────────────

export async function getFinancialSummary(nutritionistId: string) {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    totalRevenue,
    monthlyRevenue,
    lastMonthRevenue,
    pendingPayments,
    overdueInvoices,
    recentPayments,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { recordedById: nutritionistId, status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        recordedById: nutritionistId,
        status: 'COMPLETED',
        paidAt: { gte: firstOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        recordedById: nutritionistId,
        status: 'COMPLETED',
        paidAt: { gte: firstOfLastMonth, lt: firstOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { recordedById: nutritionistId, status: 'PENDING' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.count({
      where: { status: 'OVERDUE' },
    }),
    prisma.payment.findMany({
      where: { recordedById: nutritionistId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    monthlyRevenue: monthlyRevenue._sum.amount || 0,
    lastMonthRevenue: lastMonthRevenue._sum.amount || 0,
    pendingAmount: pendingPayments._sum.amount || 0,
    pendingCount: pendingPayments._count || 0,
    overdueInvoices,
    recentPayments,
  }
}
