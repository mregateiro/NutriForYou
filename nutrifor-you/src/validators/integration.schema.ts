import { z } from 'zod'

const nonEmpty = z.string().min(1, 'This field is required')

const providerConfigSchemas: Record<string, z.ZodType> = {
  GOOGLE_CALENDAR: z.object({ clientId: nonEmpty, clientSecret: nonEmpty }),
  WHATSAPP: z.object({ apiToken: nonEmpty, phoneNumberId: nonEmpty }),
  STRIPE: z.object({ apiKey: nonEmpty }),
  PAGSEGURO: z.object({ email: nonEmpty, token: nonEmpty }),
  ZOOM: z.object({ clientId: nonEmpty, clientSecret: nonEmpty }),
  WEBHOOK: z.object({ url: z.string().url('Valid URL is required'), secret: z.string().optional() }),
}

export const connectIntegrationSchema = z
  .object({
    provider: z.enum(['GOOGLE_CALENDAR', 'WHATSAPP', 'STRIPE', 'PAGSEGURO', 'ZOOM', 'WEBHOOK']),
    config: z.record(z.unknown()),
  })
  .superRefine((data, ctx) => {
    const schema = providerConfigSchemas[data.provider]
    if (schema) {
      const result = schema.safeParse(data.config)
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ['config', ...issue.path],
          })
        }
      }
    }
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
