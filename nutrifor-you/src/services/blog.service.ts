import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreateBlogPostInput, UpdateBlogPostInput, CreateLandingPageInput, UpdateLandingPageInput } from '@/validators/blog.schema'

// ─── Blog Posts ────────────────────────────────────────────

export async function createBlogPost(authorId: string, input: CreateBlogPostInput) {
  const post = await prisma.blogPost.create({
    data: {
      authorId,
      ...input,
      coverImageUrl: input.coverImageUrl ?? undefined,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : undefined,
    },
    include: { author: { select: { id: true, name: true } } },
  })

  await createAuditLog({
    userId: authorId,
    action: AuditAction.CREATE,
    entity: 'BlogPost',
    entityId: post.id,
    details: { title: post.title },
  })

  logger.info({ postId: post.id, authorId }, 'Blog post created')
  return post
}

export async function listBlogPosts(params: {
  status?: string
  category?: string
  authorId?: string
  page?: number
  perPage?: number
}) {
  const { page = 1, perPage = 20, status, category, authorId } = params
  const where: Record<string, unknown> = {}

  if (status) where.status = status
  if (category) where.category = category
  if (authorId) where.authorId = authorId

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.blogPost.count({ where }),
  ])

  return {
    data: posts,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function getBlogPost(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { author: { select: { id: true, name: true } } },
  })

  if (!post) throw new Error('Post not found')

  await prisma.blogPost.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  })

  return post
}

export async function updateBlogPost(postId: string, userId: string, input: UpdateBlogPostInput) {
  const existing = await prisma.blogPost.findUnique({ where: { id: postId } })
  if (!existing) throw new Error('Post not found')

  const data: Record<string, unknown> = { ...input }
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl ?? null
  if (input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
    data.publishedAt = new Date()
  }

  const post = await prisma.blogPost.update({
    where: { id: postId },
    data,
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'BlogPost',
    entityId: postId,
    details: { updatedFields: Object.keys(input) },
  })

  return post
}

export async function deleteBlogPost(postId: string, userId: string) {
  await prisma.blogPost.delete({ where: { id: postId } })
  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    entity: 'BlogPost',
    entityId: postId,
  })
}

// ─── Landing Pages ─────────────────────────────────────────

export async function createLandingPage(authorId: string, input: CreateLandingPageInput) {
  const page = await prisma.landingPage.create({
    data: {
      authorId,
      title: input.title,
      slug: input.slug,
      sections: JSON.parse(JSON.stringify(input.sections)),
      isPublished: input.isPublished,
    },
  })

  logger.info({ pageId: page.id, authorId }, 'Landing page created')
  return page
}

export async function listLandingPages(authorId?: string) {
  const where = authorId ? { authorId } : {}
  return prisma.landingPage.findMany({
    where,
    include: { author: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getLandingPage(slug: string) {
  const page = await prisma.landingPage.findUnique({
    where: { slug },
    include: { author: { select: { id: true, name: true } } },
  })
  if (!page) throw new Error('Page not found')
  return page
}

export async function updateLandingPage(pageId: string, input: UpdateLandingPageInput) {
  const existing = await prisma.landingPage.findUnique({ where: { id: pageId } })
  if (!existing) throw new Error('Page not found')

  return prisma.landingPage.update({
    where: { id: pageId },
    data: {
      title: input.title,
      slug: input.slug,
      sections: input.sections ? JSON.parse(JSON.stringify(input.sections)) : undefined,
      isPublished: input.isPublished,
    },
  })
}

export async function deleteLandingPage(pageId: string) {
  await prisma.landingPage.delete({ where: { id: pageId } })
}
