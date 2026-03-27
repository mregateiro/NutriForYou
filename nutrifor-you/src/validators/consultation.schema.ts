import { z } from 'zod'

export const createConsultationSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  templateId: z.string().optional(),
  title: z.string().optional(),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  privateNotes: z.string().optional(),
  duration: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bodyFat: z.number().min(0).max(100).optional(),
  waistCirc: z.number().positive().optional(),
  hipCirc: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'COMPLETED']).default('COMPLETED'),
  scheduledAt: z.string().optional(),
})

export const updateConsultationSchema = createConsultationSchema.partial().omit({ patientId: true })

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().optional(),
  content: z.string().min(1, 'Template content is required'),
  isDefault: z.boolean().default(false),
})

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
