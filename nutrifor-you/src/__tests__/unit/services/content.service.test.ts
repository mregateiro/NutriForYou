import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildContentArticle, buildStudyReference } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createContentArticle
// ---------------------------------------------------------------------------
describe('createContentArticle', () => {
  it('creates article with audit log', async () => {
    const input = {
      title: 'Test Article',
      slug: 'test-article',
      content: 'Content here',
      excerpt: 'Excerpt',
      category: 'NUTRITION',
      contentType: 'ARTICLE',
    }
    const article = buildContentArticle({ authorId: 'author-1', ...input })
    prisma.contentArticle.create.mockResolvedValue(article)

    const { createContentArticle } = await import('@/services/content.service')
    const result = await createContentArticle('author-1', input as never)

    expect(prisma.contentArticle.create).toHaveBeenCalledWith({
      data: { authorId: 'author-1', ...input, coverImageUrl: undefined },
      include: { author: { select: { id: true, name: true } } },
    })
    expect(result).toEqual(article)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'author-1',
      action: 'CREATE',
      entity: 'ContentArticle',
      entityId: article.id,
      details: { title: article.title },
    })
  })
})

// ---------------------------------------------------------------------------
// listContentArticles
// ---------------------------------------------------------------------------
describe('listContentArticles', () => {
  it('returns paginated articles with default params', async () => {
    const articles = [buildContentArticle(), buildContentArticle()]
    prisma.contentArticle.findMany.mockResolvedValue(articles)
    prisma.contentArticle.count.mockResolvedValue(2)

    const { listContentArticles } = await import('@/services/content.service')
    const result = await listContentArticles({})

    expect(prisma.contentArticle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } })
    )
    expect(result.data).toEqual(articles)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })

  it('filters by category', async () => {
    prisma.contentArticle.findMany.mockResolvedValue([])
    prisma.contentArticle.count.mockResolvedValue(0)

    const { listContentArticles } = await import('@/services/content.service')
    await listContentArticles({ category: 'NUTRITION' })

    expect(prisma.contentArticle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category: 'NUTRITION' } })
    )
  })

  it('filters by contentType', async () => {
    prisma.contentArticle.findMany.mockResolvedValue([])
    prisma.contentArticle.count.mockResolvedValue(0)

    const { listContentArticles } = await import('@/services/content.service')
    await listContentArticles({ contentType: 'VIDEO' })

    expect(prisma.contentArticle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { contentType: 'VIDEO' } })
    )
  })

  it('filters by isPublished', async () => {
    prisma.contentArticle.findMany.mockResolvedValue([])
    prisma.contentArticle.count.mockResolvedValue(0)

    const { listContentArticles } = await import('@/services/content.service')
    await listContentArticles({ isPublished: true })

    expect(prisma.contentArticle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: true } })
    )
  })
})

// ---------------------------------------------------------------------------
// getContentArticle
// ---------------------------------------------------------------------------
describe('getContentArticle', () => {
  it('returns article and increments viewCount', async () => {
    const article = buildContentArticle({ slug: 'test-slug' })
    prisma.contentArticle.findUnique.mockResolvedValue(article)
    prisma.contentArticle.update.mockResolvedValue({ ...article, viewCount: 1 })

    const { getContentArticle } = await import('@/services/content.service')
    const result = await getContentArticle('test-slug')

    expect(prisma.contentArticle.findUnique).toHaveBeenCalledWith({
      where: { slug: 'test-slug' },
      include: { author: { select: { id: true, name: true } } },
    })
    expect(prisma.contentArticle.update).toHaveBeenCalledWith({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    })
    expect(result).toEqual(article)
  })

  it('throws when not found', async () => {
    prisma.contentArticle.findUnique.mockResolvedValue(null)

    const { getContentArticle } = await import('@/services/content.service')
    await expect(getContentArticle('non-existent')).rejects.toThrow('Article not found')
  })
})

// ---------------------------------------------------------------------------
// updateContentArticle
// ---------------------------------------------------------------------------
describe('updateContentArticle', () => {
  it('updates article and creates audit log', async () => {
    const existing = buildContentArticle()
    const input = { title: 'Updated Title' }
    const updated = { ...existing, title: 'Updated Title' }

    prisma.contentArticle.findUnique.mockResolvedValue(existing)
    prisma.contentArticle.update.mockResolvedValue(updated)

    const { updateContentArticle } = await import('@/services/content.service')
    const result = await updateContentArticle(existing.id, 'user-1', input as never)

    expect(prisma.contentArticle.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ title: 'Updated Title' }),
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'ContentArticle',
      entityId: existing.id,
      details: { updatedFields: ['title'] },
    })
  })

  it('throws when article not found', async () => {
    prisma.contentArticle.findUnique.mockResolvedValue(null)

    const { updateContentArticle } = await import('@/services/content.service')
    await expect(updateContentArticle('bad-id', 'user-1', { title: 'X' } as never)).rejects.toThrow(
      'Article not found'
    )

    expect(prisma.contentArticle.update).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// deleteContentArticle
// ---------------------------------------------------------------------------
describe('deleteContentArticle', () => {
  it('deletes article with audit log', async () => {
    const existing = buildContentArticle({ id: 'article-1' })
    prisma.contentArticle.findUnique.mockResolvedValue(existing)
    prisma.contentArticle.delete.mockResolvedValue(existing)

    const { deleteContentArticle } = await import('@/services/content.service')
    await deleteContentArticle('article-1', 'user-1')

    expect(prisma.contentArticle.delete).toHaveBeenCalledWith({ where: { id: 'article-1' } })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'DELETE',
      entity: 'ContentArticle',
      entityId: 'article-1',
    })
  })

  it('throws when article not found', async () => {
    prisma.contentArticle.findUnique.mockResolvedValue(null)

    const { deleteContentArticle } = await import('@/services/content.service')
    await expect(deleteContentArticle('bad-id', 'user-1')).rejects.toThrow('Article not found')

    expect(prisma.contentArticle.delete).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// createStudyReference
// ---------------------------------------------------------------------------
describe('createStudyReference', () => {
  it('creates study reference', async () => {
    const input = {
      title: 'Nutrition Study',
      journal: 'Journal of Nutrition',
      authors: 'Smith J',
      year: 2024,
      doi: '10.1234/test',
      url: 'https://doi.org/10.1234/test',
      summary: 'Study summary',
    }
    const study = buildStudyReference({ addedById: 'user-1', ...input })
    prisma.studyReference.create.mockResolvedValue(study)

    const { createStudyReference } = await import('@/services/content.service')
    const result = await createStudyReference('user-1', input as never)

    expect(prisma.studyReference.create).toHaveBeenCalledWith({
      data: { addedById: 'user-1', ...input },
      include: { addedBy: { select: { id: true, name: true } } },
    })
    expect(result).toEqual(study)
  })
})

// ---------------------------------------------------------------------------
// listStudyReferences
// ---------------------------------------------------------------------------
describe('listStudyReferences', () => {
  it('returns paginated studies with default params', async () => {
    const studies = [buildStudyReference(), buildStudyReference()]
    prisma.studyReference.findMany.mockResolvedValue(studies)
    prisma.studyReference.count.mockResolvedValue(2)

    const { listStudyReferences } = await import('@/services/content.service')
    const result = await listStudyReferences({})

    expect(prisma.studyReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } })
    )
    expect(result.data).toEqual(studies)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })

  it('applies search filter on title and journal', async () => {
    prisma.studyReference.findMany.mockResolvedValue([])
    prisma.studyReference.count.mockResolvedValue(0)

    const { listStudyReferences } = await import('@/services/content.service')
    await listStudyReferences({ search: 'nutrition' })

    expect(prisma.studyReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { title: { contains: 'nutrition', mode: 'insensitive' } },
            { journal: { contains: 'nutrition', mode: 'insensitive' } },
          ],
        },
      })
    )
  })
})

// ---------------------------------------------------------------------------
// updateStudyReference
// ---------------------------------------------------------------------------
describe('updateStudyReference', () => {
  it('updates study reference', async () => {
    const existing = buildStudyReference()
    const input = { title: 'Updated Study' }
    const updated = { ...existing, title: 'Updated Study' }

    prisma.studyReference.findUnique.mockResolvedValue(existing)
    prisma.studyReference.update.mockResolvedValue(updated)

    const { updateStudyReference } = await import('@/services/content.service')
    const result = await updateStudyReference(existing.id, input as never)

    expect(prisma.studyReference.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: input,
    })
    expect(result).toEqual(updated)
  })

  it('throws when study not found', async () => {
    prisma.studyReference.findUnique.mockResolvedValue(null)

    const { updateStudyReference } = await import('@/services/content.service')
    await expect(updateStudyReference('bad-id', { title: 'X' } as never)).rejects.toThrow(
      'Study not found'
    )
  })
})

// ---------------------------------------------------------------------------
// deleteStudyReference
// ---------------------------------------------------------------------------
describe('deleteStudyReference', () => {
  it('deletes study reference', async () => {
    prisma.studyReference.delete.mockResolvedValue({})

    const { deleteStudyReference } = await import('@/services/content.service')
    await deleteStudyReference('study-1')

    expect(prisma.studyReference.delete).toHaveBeenCalledWith({ where: { id: 'study-1' } })
  })
})
