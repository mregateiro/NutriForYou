import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/blog.service', () => ({
  listBlogPosts: vi.fn(),
  createBlogPost: vi.fn(),
  listLandingPages: vi.fn(),
  createLandingPage: vi.fn(),
}))

function buildGetRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/blog/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/blog/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/blog/posts (public) ────────────────────────────────────
describe('GET /api/blog/posts', () => {
  it('returns 200 with blog posts (no auth required)', async () => {
    const mockResult = {
      data: [{ id: 'bp1', title: 'Healthy Eating' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listBlogPosts } = await import('@/services/blog.service')
    vi.mocked(listBlogPosts).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/blog/posts/route')
    const response = await GET(buildGetRequest('posts') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes query parameters to service', async () => {
    const { listBlogPosts } = await import('@/services/blog.service')
    vi.mocked(listBlogPosts).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 } as never)

    const { GET } = await import('@/app/api/blog/posts/route')
    await GET(buildGetRequest('posts', { status: 'PUBLISHED', category: 'nutrition' }) as never)

    expect(listBlogPosts).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', category: 'nutrition' }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { listBlogPosts } = await import('@/services/blog.service')
    vi.mocked(listBlogPosts).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/blog/posts/route')
    const response = await GET(buildGetRequest('posts') as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/blog/posts ────────────────────────────────────────────
describe('POST /api/blog/posts', () => {
  const validPost = {
    title: 'My Post',
    slug: 'my-post',
    content: 'Some great content here',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/blog/posts/route')
    const response = await POST(buildPostRequest('posts', validPost) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockPost = { id: 'bp-new', ...validPost }
    const { createBlogPost } = await import('@/services/blog.service')
    vi.mocked(createBlogPost).mockResolvedValue(mockPost as never)

    const { POST } = await import('@/app/api/blog/posts/route')
    const response = await POST(buildPostRequest('posts', validPost) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockPost)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/blog/posts/route')
    const response = await POST(buildPostRequest('posts', { title: '' }) as never)

    expect(response.status).toBe(500)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createBlogPost } = await import('@/services/blog.service')
    vi.mocked(createBlogPost).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/blog/posts/route')
    const response = await POST(buildPostRequest('posts', validPost) as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/blog/pages ─────────────────────────────────────────────
describe('GET /api/blog/pages', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/blog/pages/route')
    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('returns 200 with landing pages', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockPages = [{ id: 'lp1', title: 'Landing Page 1' }]
    const { listLandingPages } = await import('@/services/blog.service')
    vi.mocked(listLandingPages).mockResolvedValue(mockPages as never)

    const { GET } = await import('@/app/api/blog/pages/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockPages)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listLandingPages } = await import('@/services/blog.service')
    vi.mocked(listLandingPages).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/blog/pages/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/blog/pages ────────────────────────────────────────────
describe('POST /api/blog/pages', () => {
  const validPage = {
    title: 'Landing Page',
    slug: 'landing-page',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/blog/pages/route')
    const response = await POST(buildPostRequest('pages', validPage) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockPage = { id: 'lp-new', ...validPage }
    const { createLandingPage } = await import('@/services/blog.service')
    vi.mocked(createLandingPage).mockResolvedValue(mockPage as never)

    const { POST } = await import('@/app/api/blog/pages/route')
    const response = await POST(buildPostRequest('pages', validPage) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockPage)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/blog/pages/route')
    const response = await POST(buildPostRequest('pages', { title: '' }) as never)

    expect(response.status).toBe(500)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createLandingPage } = await import('@/services/blog.service')
    vi.mocked(createLandingPage).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/blog/pages/route')
    const response = await POST(buildPostRequest('pages', validPage) as never)

    expect(response.status).toBe(500)
  })
})
