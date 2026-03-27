import { z } from 'zod'

export const changeSubscriptionSchema = z.object({
  tier: z.enum(['LITE', 'PREMIUM', 'BUSINESS']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
})

export const cancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
  immediate: z.boolean().default(false),
})

export type ChangeSubscriptionInput = z.infer<typeof changeSubscriptionSchema>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
