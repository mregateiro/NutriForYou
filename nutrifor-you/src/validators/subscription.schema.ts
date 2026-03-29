import { z } from 'zod'

export const changeSubscriptionSchema = z.object({
  tier: z.enum(['LITE', 'PREMIUM', 'BUSINESS']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
})

export const cancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
  immediate: z.boolean().default(false),
})

export const confirmPaymentSchema = z.object({
  action: z.literal('confirm_payment'),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'bank_transfer', 'mbway']),
})

export type ChangeSubscriptionInput = z.infer<typeof changeSubscriptionSchema>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>
