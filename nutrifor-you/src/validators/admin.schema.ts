import { z } from 'zod'

export const createFeatureFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_-]*$/, 'Key must be lowercase, start with a letter, and contain only letters, numbers, hyphens, and underscores'),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().default(false),
  tiers: z.array(z.enum(['TRIAL', 'LITE', 'PREMIUM', 'BUSINESS'])).default([]),
  metadata: z.record(z.unknown()).optional(),
})

export const updateFeatureFlagSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().optional(),
  tiers: z.array(z.enum(['TRIAL', 'LITE', 'PREMIUM', 'BUSINESS'])).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'NUTRITIONIST', 'PATIENT']),
})

export const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['APPOINTMENT_REMINDER', 'APPOINTMENT_CANCELED', 'NEW_MESSAGE', 'MEAL_PLAN_READY', 'PAYMENT_DUE', 'PAYMENT_RECEIVED', 'CONTRACT_SIGNED', 'SYSTEM']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  website: z.string().url().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(10).optional(),
  postalCode: z.string().max(20).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
})

export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagSchema>
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
