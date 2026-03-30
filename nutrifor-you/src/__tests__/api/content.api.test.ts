import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/content.service', () => ({
  listContentArticles: vi.fn(),
  createContentArticle: vi.fn(),
  listStudyReferences: vi.fn(),
  createStudyReference: vi.fn(),
}))

function buildGetRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/content/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/content/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/content/articles (public) ──────────────────────────────
describe('GET /api/content/articles', () => {
  it('returns 200 with articles (no auth required)', async () => {
    const mockResult = {
      data: [{ id: 'a1', title: 'Nutrition Tips' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listContentArticles } = await import('@/services/content.service')
    vi.mocked(listContentArticles).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/content/articles/route')
    const response = await GET(buildGetRequest('articles') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes query parameters to service', async () => {
    const { listContentArticles } = await import('@/services/content.service')
    vi.mocked(listContentArticles).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 } as never)

    const { GET } = await import('@/app/api/content/articles/route')
    await GET(buildGetRequest('articles', { category: 'health', contentType: 'guide' }) as never)

    expect(listContentArticles).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'health', contentType: 'guide' }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { listContentArticles } = await import('@/services/content.service')
    vi.mocked(listContentArticles).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/content/articles/route')
    const response = await GET(buildGetRequest('articles') as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/content/articles ──────────────────────────────────────
describe('POST /api/content/articles', () => {
  const validArticle = {
    title: 'My Article',
    slug: 'my-article',
    content: 'Great content here',
    category: 'NUTRITION',
    contentType: 'ARTICLE',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/content/articles/route')
    const response = await POST(buildPostRequest('articles', validArticle) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockArticle = { id: 'a-new', ...validArticle }
    const { createContentArticle } = await import('@/services/content.service')
    vi.mocked(createContentArticle).mockResolvedValue(mockArticle as never)

    const { POST } = await import('@/app/api/content/articles/route')
    const response = await POST(buildPostRequest('articles', validArticle) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockArticle)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/content/articles/route')
    const response = await POST(buildPostRequest('articles', { title: '' }) as never)

    expect(response.status).toBe(500)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createContentArticle } = await import('@/services/content.service')
    vi.mocked(createContentArticle).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/content/articles/route')
    const response = await POST(buildPostRequest('articles', validArticle) as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/content/studies ────────────────────────────────────────
describe('GET /api/content/studies', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/content/studies/route')
    const response = await GET(buildGetRequest('studies') as never)

    expect(response.status).toBe(401)
  })

  it('returns 200 with study references', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 's1', title: 'Study 1' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listStudyReferences } = await import('@/services/content.service')
    vi.mocked(listStudyReferences).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/content/studies/route')
    const response = await GET(buildGetRequest('studies') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listStudyReferences } = await import('@/services/content.service')
    vi.mocked(listStudyReferences).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/content/studies/route')
    const response = await GET(buildGetRequest('studies') as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/content/studies ───────────────────────────────────────
describe('POST /api/content/studies', () => {
  const validStudy = {
    title: 'New Study',
    authors: ['Dr. Smith'],
    journal: 'Nature',
    url: 'https://example.com/study',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/content/studies/route')
    const response = await POST(buildPostRequest('studies', validStudy) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockStudy = { id: 's-new', ...validStudy }
    const { createStudyReference } = await import('@/services/content.service')
    vi.mocked(createStudyReference).mockResolvedValue(mockStudy as never)

    const { POST } = await import('@/app/api/content/studies/route')
    const response = await POST(buildPostRequest('studies', validStudy) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockStudy)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/content/studies/route')
    const response = await POST(buildPostRequest('studies', { title: '' }) as never)

    expect(response.status).toBe(500)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createStudyReference } = await import('@/services/content.service')
    vi.mocked(createStudyReference).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/content/studies/route')
    const response = await POST(buildPostRequest('studies', validStudy) as never)

    expect(response.status).toBe(500)
  })
})
