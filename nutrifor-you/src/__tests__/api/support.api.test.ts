import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession, createMockAdminSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/support.service', () => ({
  listTickets: vi.fn(),
  createTicket: vi.fn(),
  listKBArticles: vi.fn(),
  createKBArticle: vi.fn(),
}))

function buildGetRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/support/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/support/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/support/tickets ────────────────────────────────────────
describe('GET /api/support/tickets', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/support/tickets/route')
    const response = await GET(buildGetRequest('tickets') as never)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with tickets list', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 't1', subject: 'Help needed', status: 'OPEN' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listTickets } = await import('@/services/support.service')
    vi.mocked(listTickets).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/support/tickets/route')
    const response = await GET(buildGetRequest('tickets') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listTickets } = await import('@/services/support.service')
    vi.mocked(listTickets).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/support/tickets/route')
    const response = await GET(buildGetRequest('tickets') as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/support/tickets ───────────────────────────────────────
describe('POST /api/support/tickets', () => {
  const validTicket = {
    subject: 'Help needed',
    description: 'I need help with my account',
    priority: 'MEDIUM',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/support/tickets/route')
    const response = await POST(buildPostRequest('tickets', validTicket) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockTicket = { id: 't-new', ...validTicket }
    const { createTicket } = await import('@/services/support.service')
    vi.mocked(createTicket).mockResolvedValue(mockTicket as never)

    const { POST } = await import('@/app/api/support/tickets/route')
    const response = await POST(buildPostRequest('tickets', validTicket) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockTicket)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/support/tickets/route')
    const response = await POST(buildPostRequest('tickets', { subject: '' }) as never)

    expect(response.status).toBe(500)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createTicket } = await import('@/services/support.service')
    vi.mocked(createTicket).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/support/tickets/route')
    const response = await POST(buildPostRequest('tickets', validTicket) as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/support/kb (public) ────────────────────────────────────
describe('GET /api/support/kb', () => {
  it('returns 200 with KB articles (no auth required)', async () => {
    const mockResult = {
      data: [{ id: 'kb1', title: 'Getting Started' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listKBArticles } = await import('@/services/support.service')
    vi.mocked(listKBArticles).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/support/kb/route')
    const response = await GET(buildGetRequest('kb') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes query parameters to service', async () => {
    const { listKBArticles } = await import('@/services/support.service')
    vi.mocked(listKBArticles).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 } as never)

    const { GET } = await import('@/app/api/support/kb/route')
    await GET(buildGetRequest('kb', { category: 'getting-started' }) as never)

    expect(listKBArticles).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'getting-started' }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { listKBArticles } = await import('@/services/support.service')
    vi.mocked(listKBArticles).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/support/kb/route')
    const response = await GET(buildGetRequest('kb') as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/support/kb ────────────────────────────────────────────
describe('POST /api/support/kb', () => {
  const validKBArticle = {
    title: 'Getting Started',
    slug: 'getting-started',
    content: 'How to get started with the platform',
    category: 'GENERAL',
  }

  it('returns 403 without admin session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/support/kb/route')
    const response = await POST(buildPostRequest('kb', validKBArticle) as never)

    expect(response.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/support/kb/route')
    const response = await POST(buildPostRequest('kb', validKBArticle) as never)

    expect(response.status).toBe(403)
  })

  it('returns 201 on successful creation with admin session', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockAdminSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockArticle = { id: 'kb-new', ...validKBArticle }
    const { createKBArticle } = await import('@/services/support.service')
    vi.mocked(createKBArticle).mockResolvedValue(mockArticle as never)

    const { POST } = await import('@/app/api/support/kb/route')
    const response = await POST(buildPostRequest('kb', validKBArticle) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockArticle)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { POST } = await import('@/app/api/support/kb/route')
    const response = await POST(buildPostRequest('kb', { title: '' }) as never)

    expect(response.status).toBe(500)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { createKBArticle } = await import('@/services/support.service')
    vi.mocked(createKBArticle).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/support/kb/route')
    const response = await POST(buildPostRequest('kb', validKBArticle) as never)

    expect(response.status).toBe(500)
  })
})
