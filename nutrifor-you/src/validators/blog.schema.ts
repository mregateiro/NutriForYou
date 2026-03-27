import { z } from 'zod'

export const createBlogPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly'),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  coverImageUrl: z.string().url().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  tags: z.array(z.string()).default([]),
  category: z.string().max(100).optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
})

export const updateBlogPostSchema = createBlogPostSchema.partial()

export const createLandingPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly'),
  sections: z.array(z.object({
    type: z.enum(['hero', 'features', 'testimonials', 'cta', 'text', 'image']),
    content: z.record(z.unknown()),
    order: z.number().int(),
  })).default([]),
  isPublished: z.boolean().default(false),
})

export const updateLandingPageSchema = createLandingPageSchema.partial()

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>
export type CreateLandingPageInput = z.infer<typeof createLandingPageSchema>
export type UpdateLandingPageInput = z.infer<typeof updateLandingPageSchema>
