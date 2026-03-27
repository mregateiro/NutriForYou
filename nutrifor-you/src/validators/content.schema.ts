import { z } from 'zod'

export const createContentArticleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly'),
  summary: z.string().max(500).optional(),
  content: z.string().min(1),
  contentType: z.enum(['ARTICLE', 'VIDEO', 'INFOGRAPHIC', 'STUDY', 'GUIDE']).default('ARTICLE'),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
  coverImageUrl: z.string().url().optional().nullable(),
  isPublished: z.boolean().default(false),
})

export const updateContentArticleSchema = createContentArticleSchema.partial()

export const createStudyReferenceSchema = z.object({
  title: z.string().min(1).max(300),
  authors: z.array(z.string()).min(1),
  journal: z.string().max(200).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  doi: z.string().max(100).optional(),
  url: z.string().url().optional(),
  abstract: z.string().max(5000).optional(),
  tags: z.array(z.string()).default([]),
})

export const updateStudyReferenceSchema = createStudyReferenceSchema.partial()

export type CreateContentArticleInput = z.infer<typeof createContentArticleSchema>
export type UpdateContentArticleInput = z.infer<typeof updateContentArticleSchema>
export type CreateStudyReferenceInput = z.infer<typeof createStudyReferenceSchema>
export type UpdateStudyReferenceInput = z.infer<typeof updateStudyReferenceSchema>
