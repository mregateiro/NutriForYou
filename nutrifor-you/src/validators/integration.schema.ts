import { z } from 'zod'

export const connectIntegrationSchema = z.object({
  provider: z.enum(['GOOGLE_CALENDAR', 'WHATSAPP', 'STRIPE', 'PAGSEGURO', 'ZOOM', 'WEBHOOK']),
  config: z.record(z.unknown()).optional(),
})

export const updateIntegrationSchema = z.object({
  config: z.record(z.unknown()).optional(),
  status: z.enum(['CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING']).optional(),
})

export const webhookConfigSchema = z.object({
  url: z.string().url('Valid URL is required'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  secret: z.string().min(8).optional(),
})

export type ConnectIntegrationInput = z.infer<typeof connectIntegrationSchema>
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>
export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>
