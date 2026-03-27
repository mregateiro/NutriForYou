import { z } from 'zod'

export const createConversationSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1, 'At least one participant is required'),
  title: z.string().max(200).optional(),
  isGroup: z.boolean().default(false),
})

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(5000),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
  fileUrl: z.string().url().optional(),
})

export const updateMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(5000),
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>
