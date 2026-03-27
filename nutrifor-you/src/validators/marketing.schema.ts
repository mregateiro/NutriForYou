import { z } from 'zod'

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['EMAIL', 'SMS', 'IN_APP']).default('EMAIL'),
  subject: z.string().max(200).optional(),
  content: z.string().min(1),
  templateId: z.string().optional(),
  segmentId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
})

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED']).optional(),
})

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  htmlBody: z.string().min(1),
  variables: z.array(z.string()).default([]),
})

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial()

export const createContactSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  filters: z.object({
    roles: z.array(z.string()).optional(),
    tiers: z.array(z.string()).optional(),
    createdAfter: z.string().optional(),
    createdBefore: z.string().optional(),
    hasActiveSubscription: z.boolean().optional(),
  }),
})

export const updateContactSegmentSchema = createContactSegmentSchema.partial()

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>
export type CreateContactSegmentInput = z.infer<typeof createContactSegmentSchema>
export type UpdateContactSegmentInput = z.infer<typeof updateContactSegmentSchema>
