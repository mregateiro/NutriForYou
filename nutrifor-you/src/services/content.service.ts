import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type { CreateContentArticleInput, UpdateContentArticleInput, CreateStudyReferenceInput, UpdateStudyReferenceInput } from '@/validators/content.schema'

// ─── Content Articles ──────────────────────────────────────

export async function createContentArticle(authorId: string, input: CreateContentArticleInput) {
  const article = await prisma.contentArticle.create({
    data: { authorId, ...input, coverImageUrl: input.coverImageUrl ?? undefined },
    include: { author: { select: { id: true, name: true } } },
  })

  await createAuditLog({
    userId: authorId,
    action: AuditAction.CREATE,
    entity: 'ContentArticle',
    entityId: article.id,
    details: { title: article.title },
  })

  logger.info({ articleId: article.id, authorId }, 'Content article created')
  return article
}

export async function listContentArticles(params: {
  category?: string
  contentType?: string
  isPublished?: boolean
  page?: number
  perPage?: number
}) {
  const { page = 1, perPage = 20, category, contentType, isPublished } = params
  const where: Record<string, unknown> = {}

  if (category) where.category = category
  if (contentType) where.contentType = contentType
  if (isPublished !== undefined) where.isPublished = isPublished

  const [articles, total] = await Promise.all([
    prisma.contentArticle.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.contentArticle.count({ where }),
  ])

  return {
    data: articles,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function getContentArticle(slug: string) {
  const article = await prisma.contentArticle.findUnique({
    where: { slug },
    include: { author: { select: { id: true, name: true } } },
  })

  if (!article) throw new Error('Article not found')

  await prisma.contentArticle.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  })

  return article
}

export async function updateContentArticle(articleId: string, userId: string, input: UpdateContentArticleInput) {
  const existing = await prisma.contentArticle.findUnique({ where: { id: articleId } })
  if (!existing) throw new Error('Article not found')

  const article = await prisma.contentArticle.update({
    where: { id: articleId },
    data: { ...input, coverImageUrl: input.coverImageUrl ?? undefined },
  })

  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    entity: 'ContentArticle',
    entityId: articleId,
    details: { updatedFields: Object.keys(input) },
  })

  return article
}

export async function deleteContentArticle(articleId: string, userId: string) {
  const existing = await prisma.contentArticle.findUnique({ where: { id: articleId } })
  if (!existing) throw new Error('Article not found')

  await prisma.contentArticle.delete({ where: { id: articleId } })

  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    entity: 'ContentArticle',
    entityId: articleId,
  })
}

// ─── Study References ──────────────────────────────────────

export async function createStudyReference(addedById: string, input: CreateStudyReferenceInput) {
  const study = await prisma.studyReference.create({
    data: { addedById, ...input },
    include: { addedBy: { select: { id: true, name: true } } },
  })

  logger.info({ studyId: study.id, addedById }, 'Study reference created')
  return study
}

export async function listStudyReferences(params: {
  page?: number
  perPage?: number
  search?: string
}) {
  const { page = 1, perPage = 20, search } = params
  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { journal: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [studies, total] = await Promise.all([
    prisma.studyReference.findMany({
      where,
      include: { addedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.studyReference.count({ where }),
  ])

  return {
    data: studies,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function updateStudyReference(studyId: string, input: UpdateStudyReferenceInput) {
  const existing = await prisma.studyReference.findUnique({ where: { id: studyId } })
  if (!existing) throw new Error('Study not found')

  return prisma.studyReference.update({ where: { id: studyId }, data: input })
}

export async function deleteStudyReference(studyId: string) {
  await prisma.studyReference.delete({ where: { id: studyId } })
}
