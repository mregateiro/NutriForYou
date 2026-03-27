import { z } from 'zod'

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  title: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.string().min(1, 'Start time is required'),
  endsAt: z.string().min(1, 'End time is required'),
  type: z.enum(['IN_PERSON', 'VIDEO', 'PHONE']).default('IN_PERSON'),
  location: z.string().optional(),
  videoLink: z.string().url().optional(),
  notes: z.string().optional(),
})

export const updateAppointmentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  type: z.enum(['IN_PERSON', 'VIDEO', 'PHONE']).optional(),
  location: z.string().optional(),
  videoLink: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW']).optional(),
  cancelReason: z.string().optional(),
})

export const createAvailabilityRuleSchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  slotDuration: z.number().int().min(15).max(240).default(60),
  isActive: z.boolean().default(true),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
export type CreateAvailabilityRuleInput = z.infer<typeof createAvailabilityRuleSchema>
