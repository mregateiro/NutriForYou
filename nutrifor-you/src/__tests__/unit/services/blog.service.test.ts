import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildBlogPost, buildLandingPage } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

describe('createBlogPost', () => {
  it('creates post with audit log', async () => {
    const input = {
      title: 'My Post',
      slug: 'my-post',
      content: 'Post content',
      excerpt: 'Short',
      category: 'NUTRITION',
      status: 'DRAFT' as const,
    }
    const post = buildBlogPost({ authorId: 'author-1', ...input })
    prisma.blogPost.create.mockResolvedValue(post)

    const { createBlogPost } = await import('@/services/blog.service')
    const result = await createBlogPost('author-1', input)

    expect(prisma.blogPost.create).toHaveBeenCalledWith({
      data: {
        authorId: 'author-1',
        ...input,
        coverImageUrl: undefined,
        publishedAt: undefined,
      },
      include: { author: { select: { id: true, name: true } } },
    })
    expect(result).toEqual(post)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'author-1',
      action: 'CREATE',
      entity: 'BlogPost',
      entityId: post.id,
      details: { title: post.title },
    })
  })

  it('sets publishedAt when status is PUBLISHED', async () => {
    const input = {
      title: 'Published Post',
      slug: 'published-post',
      content: 'Content',
      excerpt: 'Excerpt',
      category: 'NUTRITION',
      status: 'PUBLISHED' as const,
    }
    const post = buildBlogPost({ authorId: 'author-1', ...input })
    prisma.blogPost.create.mockResolvedValue(post)

    const { createBlogPost } = await import('@/services/blog.service')
    await createBlogPost('author-1', input)

    expect(prisma.blogPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ publishedAt: expect.any(Date) }),
      include: { author: { select: { id: true, name: true } } },
    })
  })
})

describe('listBlogPosts', () => {
  it('returns paginated posts', async () => {
    const posts = [buildBlogPost(), buildBlogPost()]
    prisma.blogPost.findMany.mockResolvedValue(posts)
    prisma.blogPost.count.mockResolvedValue(2)

    const { listBlogPosts } = await import('@/services/blog.service')
    const result = await listBlogPosts({})

    expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } })
    )
    expect(result.data).toEqual(posts)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })

  it('filters by status', async () => {
    prisma.blogPost.findMany.mockResolvedValue([])
    prisma.blogPost.count.mockResolvedValue(0)

    const { listBlogPosts } = await import('@/services/blog.service')
    await listBlogPosts({ status: 'PUBLISHED' })

    expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PUBLISHED' } })
    )
  })

  it('filters by category', async () => {
    prisma.blogPost.findMany.mockResolvedValue([])
    prisma.blogPost.count.mockResolvedValue(0)

    const { listBlogPosts } = await import('@/services/blog.service')
    await listBlogPosts({ category: 'NUTRITION' })

    expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category: 'NUTRITION' } })
    )
  })
})

describe('getBlogPost', () => {
  it('returns post and increments viewCount', async () => {
    const post = buildBlogPost({ slug: 'test-slug' })
    prisma.blogPost.findUnique.mockResolvedValue(post)
    prisma.blogPost.update.mockResolvedValue({ ...post, viewCount: 1 })

    const { getBlogPost } = await import('@/services/blog.service')
    const result = await getBlogPost('test-slug')

    expect(prisma.blogPost.findUnique).toHaveBeenCalledWith({
      where: { slug: 'test-slug' },
      include: { author: { select: { id: true, name: true } } },
    })
    expect(prisma.blogPost.update).toHaveBeenCalledWith({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    })
    expect(result).toEqual(post)
  })

  it('throws when not found', async () => {
    prisma.blogPost.findUnique.mockResolvedValue(null)

    const { getBlogPost } = await import('@/services/blog.service')
    await expect(getBlogPost('non-existent')).rejects.toThrow('Post not found')
  })
})

describe('updateBlogPost', () => {
  it('updates post and creates audit log', async () => {
    const existing = buildBlogPost({ status: 'DRAFT' })
    const input = { title: 'Updated Title' }
    const updated = { ...existing, title: 'Updated Title' }

    prisma.blogPost.findUnique.mockResolvedValue(existing)
    prisma.blogPost.update.mockResolvedValue(updated)

    const { updateBlogPost } = await import('@/services/blog.service')
    const result = await updateBlogPost(existing.id, 'user-1', input)

    expect(prisma.blogPost.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ title: 'Updated Title' }),
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'BlogPost',
      entityId: existing.id,
      details: { updatedFields: ['title'] },
    })
  })

  it('sets publishedAt on publish', async () => {
    const existing = buildBlogPost({ status: 'DRAFT' })
    const input = { status: 'PUBLISHED' as const }
    const updated = { ...existing, status: 'PUBLISHED', publishedAt: new Date() }

    prisma.blogPost.findUnique.mockResolvedValue(existing)
    prisma.blogPost.update.mockResolvedValue(updated)

    const { updateBlogPost } = await import('@/services/blog.service')
    await updateBlogPost(existing.id, 'user-1', input)

    expect(prisma.blogPost.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ publishedAt: expect.any(Date) }),
    })
  })

  it('throws when not found', async () => {
    prisma.blogPost.findUnique.mockResolvedValue(null)

    const { updateBlogPost } = await import('@/services/blog.service')
    await expect(updateBlogPost('bad-id', 'user-1', { title: 'X' })).rejects.toThrow(
      'Post not found'
    )

    expect(prisma.blogPost.update).not.toHaveBeenCalled()
  })
})

describe('deleteBlogPost', () => {
  it('deletes with audit log', async () => {
    prisma.blogPost.delete.mockResolvedValue({})

    const { deleteBlogPost } = await import('@/services/blog.service')
    await deleteBlogPost('post-1', 'user-1')

    expect(prisma.blogPost.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'DELETE',
      entity: 'BlogPost',
      entityId: 'post-1',
    })
  })
})

describe('createLandingPage', () => {
  it('creates landing page', async () => {
    const input = {
      title: 'Landing',
      slug: 'landing',
      sections: [{ type: 'hero', title: 'Welcome' }],
      isPublished: false,
    }
    const page = buildLandingPage(input)
    prisma.landingPage.create.mockResolvedValue(page)

    const { createLandingPage } = await import('@/services/blog.service')
    const result = await createLandingPage('author-1', input)

    expect(prisma.landingPage.create).toHaveBeenCalledWith({
      data: {
        authorId: 'author-1',
        title: input.title,
        slug: input.slug,
        sections: expect.anything(),
        isPublished: false,
      },
    })
    expect(result).toEqual(page)
  })
})

describe('listLandingPages', () => {
  it('returns pages', async () => {
    const pages = [buildLandingPage(), buildLandingPage()]
    prisma.landingPage.findMany.mockResolvedValue(pages)

    const { listLandingPages } = await import('@/services/blog.service')
    const result = await listLandingPages()

    expect(prisma.landingPage.findMany).toHaveBeenCalledWith({
      where: {},
      include: { author: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    expect(result).toEqual(pages)
  })

  it('filters by authorId', async () => {
    prisma.landingPage.findMany.mockResolvedValue([])

    const { listLandingPages } = await import('@/services/blog.service')
    await listLandingPages('author-1')

    expect(prisma.landingPage.findMany).toHaveBeenCalledWith({
      where: { authorId: 'author-1' },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  })
})

describe('getLandingPage', () => {
  it('returns page', async () => {
    const page = buildLandingPage({ slug: 'my-page' })
    prisma.landingPage.findUnique.mockResolvedValue(page)

    const { getLandingPage } = await import('@/services/blog.service')
    const result = await getLandingPage('my-page')

    expect(prisma.landingPage.findUnique).toHaveBeenCalledWith({
      where: { slug: 'my-page' },
      include: { author: { select: { id: true, name: true } } },
    })
    expect(result).toEqual(page)
  })

  it('throws when not found', async () => {
    prisma.landingPage.findUnique.mockResolvedValue(null)

    const { getLandingPage } = await import('@/services/blog.service')
    await expect(getLandingPage('non-existent')).rejects.toThrow('Page not found')
  })
})

describe('updateLandingPage', () => {
  it('updates page', async () => {
    const existing = buildLandingPage()
    const input = { title: 'Updated Page' }
    const updated = { ...existing, title: 'Updated Page' }

    prisma.landingPage.findUnique.mockResolvedValue(existing)
    prisma.landingPage.update.mockResolvedValue(updated)

    const { updateLandingPage } = await import('@/services/blog.service')
    const result = await updateLandingPage(existing.id, input)

    expect(prisma.landingPage.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({ title: 'Updated Page' }),
    })
    expect(result).toEqual(updated)
  })

  it('throws when not found', async () => {
    prisma.landingPage.findUnique.mockResolvedValue(null)

    const { updateLandingPage } = await import('@/services/blog.service')
    await expect(updateLandingPage('bad-id', { title: 'X' })).rejects.toThrow('Page not found')

    expect(prisma.landingPage.update).not.toHaveBeenCalled()
  })
})

describe('deleteLandingPage', () => {
  it('deletes page', async () => {
    prisma.landingPage.delete.mockResolvedValue({})

    const { deleteLandingPage } = await import('@/services/blog.service')
    await deleteLandingPage('page-1')

    expect(prisma.landingPage.delete).toHaveBeenCalledWith({ where: { id: 'page-1' } })
  })
})
