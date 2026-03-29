import { z } from 'zod'

export const createPaymentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('EUR'),
  method: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('PENDING'),
  paidAt: z.string().optional(),
})

export const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  method: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  paidAt: z.string().optional(),
})

export const createInvoiceSchema = z.object({
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().positive('Unit price must be positive'),
    paymentId: z.string().optional(),
  })).min(1, 'At least one item is required'),
  tax: z.number().min(0).default(0),
  currency: z.string().default('EUR'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELED']).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
