import { z } from 'zod'

export const grantConsentSchema = z.object({
  purpose: z.enum(['DATA_PROCESSING', 'MARKETING', 'THIRD_PARTY_SHARING', 'HEALTH_DATA_PROCESSING']),
  granted: z.boolean(),
  version: z.string().default('1.0'),
})

export const dataExportRequestSchema = z.object({
  format: z.enum(['JSON', 'CSV']).default('JSON'),
})

export const dataErasureRequestSchema = z.object({
  confirmEmail: z.string().email('Valid email is required'),
  reason: z.string().optional(),
})

export type GrantConsentInput = z.infer<typeof grantConsentSchema>
export type DataExportRequestInput = z.infer<typeof dataExportRequestSchema>
export type DataErasureRequestInput = z.infer<typeof dataErasureRequestSchema>
