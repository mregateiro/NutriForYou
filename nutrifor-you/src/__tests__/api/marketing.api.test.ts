import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/services/marketing.service', () => ({
  listCampaigns: vi.fn(),
  createCampaign: vi.fn(),
  listEmailTemplates: vi.fn(),
  createEmailTemplate: vi.fn(),
  listContactSegments: vi.fn(),
  createContactSegment: vi.fn(),
}))

function buildGetRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/marketing/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/marketing/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

// ─── Campaigns ──────────────────────────────────────────────

describe('GET /api/marketing/campaigns', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/marketing/campaigns/route')
    const response = await GET(buildGetRequest('campaigns') as never)
    expect(response.status).toBe(401)
  })

  it('returns campaigns list', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockResult = { data: [{ id: 'c1', name: 'Campaign 1' }], pagination: { page: 1, perPage: 20, total: 1, totalPages: 1 } }
    const { listCampaigns } = await import('@/services/marketing.service')
    vi.mocked(listCampaigns).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/marketing/campaigns/route')
    const response = await GET(buildGetRequest('campaigns') as never)
    expect(response.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listCampaigns } = await import('@/services/marketing.service')
    vi.mocked(listCampaigns).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/marketing/campaigns/route')
    const response = await GET(buildGetRequest('campaigns') as never)
    expect(response.status).toBe(500)
  })
})

describe('POST /api/marketing/campaigns', () => {
  const validCampaign = {
    name: 'Summer Campaign',
    content: 'Check out our summer deals!',
    type: 'EMAIL',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/marketing/campaigns/route')
    const response = await POST(buildPostRequest('campaigns', validCampaign) as never)
    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockCampaign = { id: 'c-new', ...validCampaign }
    const { createCampaign } = await import('@/services/marketing.service')
    vi.mocked(createCampaign).mockResolvedValue(mockCampaign as never)

    const { POST } = await import('@/app/api/marketing/campaigns/route')
    const response = await POST(buildPostRequest('campaigns', validCampaign) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockCampaign)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/marketing/campaigns/route')
    // .parse() throws ZodError which is caught and returns 500
    const response = await POST(buildPostRequest('campaigns', { name: '' }) as never)
    expect(response.status).toBe(500)
  })
})

// ─── Templates ──────────────────────────────────────────────

describe('GET /api/marketing/templates', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/marketing/templates/route')
    const response = await GET(buildGetRequest('templates') as never)
    expect(response.status).toBe(401)
  })

  it('returns templates list', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockTemplates = [{ id: 't1', name: 'Welcome Email' }]
    const { listEmailTemplates } = await import('@/services/marketing.service')
    vi.mocked(listEmailTemplates).mockResolvedValue(mockTemplates as never)

    const { GET } = await import('@/app/api/marketing/templates/route')
    const response = await GET(buildGetRequest('templates') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockTemplates)
  })
})

describe('POST /api/marketing/templates', () => {
  const validTemplate = {
    name: 'Welcome Email',
    subject: 'Welcome to NutriForYou!',
    htmlBody: '<h1>Welcome</h1>',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/marketing/templates/route')
    const response = await POST(buildPostRequest('templates', validTemplate) as never)
    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockTemplate = { id: 't-new', ...validTemplate }
    const { createEmailTemplate } = await import('@/services/marketing.service')
    vi.mocked(createEmailTemplate).mockResolvedValue(mockTemplate as never)

    const { POST } = await import('@/app/api/marketing/templates/route')
    const response = await POST(buildPostRequest('templates', validTemplate) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockTemplate)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/marketing/templates/route')
    const response = await POST(buildPostRequest('templates', { name: '' }) as never)
    expect(response.status).toBe(500)
  })
})

// ─── Segments ───────────────────────────────────────────────

describe('GET /api/marketing/segments', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/marketing/segments/route')
    const response = await GET(buildGetRequest('segments') as never)
    expect(response.status).toBe(401)
  })

  it('returns segments list', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockSegments = [{ id: 's1', name: 'Premium Users' }]
    const { listContactSegments } = await import('@/services/marketing.service')
    vi.mocked(listContactSegments).mockResolvedValue(mockSegments as never)

    const { GET } = await import('@/app/api/marketing/segments/route')
    const response = await GET(buildGetRequest('segments') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockSegments)
  })
})

describe('POST /api/marketing/segments', () => {
  const validSegment = {
    name: 'Premium Users',
    filters: { roles: ['NUTRITIONIST'], hasActiveSubscription: true },
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/marketing/segments/route')
    const response = await POST(buildPostRequest('segments', validSegment) as never)
    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockSegment = { id: 's-new', ...validSegment, count: 10 }
    const { createContactSegment } = await import('@/services/marketing.service')
    vi.mocked(createContactSegment).mockResolvedValue(mockSegment as never)

    const { POST } = await import('@/app/api/marketing/segments/route')
    const response = await POST(buildPostRequest('segments', validSegment) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockSegment)
  })

  it('returns 500 on validation error (uses .parse())', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/marketing/segments/route')
    // Missing required filters field
    const response = await POST(buildPostRequest('segments', { name: 'Test' }) as never)
    expect(response.status).toBe(500)
  })
})
