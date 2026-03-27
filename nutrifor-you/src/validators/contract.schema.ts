import { z } from 'zod'

export const createContractSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  title: z.string().min(1, 'Title is required').max(300),
  content: z.string().min(1, 'Contract content is required'),
  expiresAt: z.string().optional(),
})

export const updateContractSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'REVOKED']).optional(),
  expiresAt: z.string().optional(),
})

export const signContractSchema = z.object({
  signatureData: z.string().min(1, 'Signature is required'),
})

export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>
export type SignContractInput = z.infer<typeof signContractSchema>
