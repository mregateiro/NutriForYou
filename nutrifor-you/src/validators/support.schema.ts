import { z } from 'zod'

export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.string().max(100).optional(),
})

export const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional().nullable(),
})

export const createReplySchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
})

export const createKBArticleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly'),
  content: z.string().min(1),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
})

export const updateKBArticleSchema = createKBArticleSchema.partial()

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CreateReplyInput = z.infer<typeof createReplySchema>
export type CreateKBArticleInput = z.infer<typeof createKBArticleSchema>
export type UpdateKBArticleInput = z.infer<typeof updateKBArticleSchema>
