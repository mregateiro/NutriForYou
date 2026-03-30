import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/integration.service', () => ({
  listIntegrations: vi.fn(),
  connectIntegration: vi.fn(),
  disconnectIntegration: vi.fn(),
  updateIntegration: vi.fn(),
}))

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildDeleteRequest(id: string) {
  return new Request(`http://localhost/api/integrations/${id}`, {
    method: 'DELETE',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/integrations
// ---------------------------------------------------------------------------
describe('GET /api/integrations', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/integrations/route')
    const response = await GET()

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns integrations list', async () => {
  it('returns integrations list including DISCONNECTED records', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockIntegrations = [
      { id: 'int-1', provider: 'STRIPE', status: 'CONNECTED' },
      { id: 'int-1', provider: 'STRIPE', status: 'CONNECTED', lastSyncAt: null },
      { id: 'int-2', provider: 'WHATSAPP', status: 'DISCONNECTED', lastSyncAt: null },
    ]
    const { listIntegrations } = await import('@/services/integration.service')
    vi.mocked(listIntegrations).mockResolvedValue(mockIntegrations as never)

    const { GET } = await import('@/app/api/integrations/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockIntegrations)
    expect(listIntegrations).toHaveBeenCalledWith(session.user.id)
    // The frontend filters by status === 'CONNECTED', so API returns all
    expect(data.data).toHaveLength(2)
    expect(data.data[1].status).toBe('DISCONNECTED')
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listIntegrations } = await import('@/services/integration.service')
    vi.mocked(listIntegrations).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/integrations/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /api/integrations
// ---------------------------------------------------------------------------
describe('POST /api/integrations', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(buildPostRequest({}) as never)
    const response = await POST(buildPostRequest({ provider: 'STRIPE' }) as never)

    expect(response.status).toBe(401)
  })

  it('returns 400 when config is missing', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({ provider: 'STRIPE' }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 when config is empty for provider requiring credentials', async () => {
  it('returns 201 on successful connection', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockIntegration = {
      id: 'int-new',
      provider: 'STRIPE',
      status: 'CONNECTED',
    }
    const { connectIntegration } = await import('@/services/integration.service')
    vi.mocked(connectIntegration).mockResolvedValue(mockIntegration as never)

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(buildPostRequest({ provider: 'STRIPE' }) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockIntegration)
    expect(data.data.status).toBe('CONNECTED')
  })

  it('returns 500 on invalid provider', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({ provider: 'STRIPE', config: {} }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 when provider is invalid', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({ provider: 'INVALID', config: { key: 'val' } }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 400 when Webhook URL is invalid', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({ provider: 'WEBHOOK', config: { url: 'not-a-url' } }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 201 on successful Stripe connection with valid config', async () => {
    const response = await POST(buildPostRequest({ provider: 'INVALID_PROVIDER' }) as never)

    expect(response.status).toBe(500)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { connectIntegration } = await import('@/services/integration.service')
    vi.mocked(connectIntegration).mockRejectedValue(new Error('Connection failed'))

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(buildPostRequest({ provider: 'STRIPE' }) as never)

    expect(response.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/integrations/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/integrations/[id]', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/integrations/[id]/route')
    const response = await DELETE(
      buildDeleteRequest('int-1') as never,
      { params: Promise.resolve({ id: 'int-1' }) },
    )

    expect(response.status).toBe(401)
  })

  it('returns 200 and sets status to DISCONNECTED', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockIntegration = { id: 'int-1', provider: 'STRIPE', status: 'CONNECTED' }
    const { connectIntegration } = await import('@/services/integration.service')
    vi.mocked(connectIntegration).mockResolvedValue(mockIntegration as never)

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({ provider: 'STRIPE', config: { apiKey: 'sk_live_abc' } }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockIntegration)
    expect(connectIntegration).toHaveBeenCalledWith(
      session.user.id,
      expect.objectContaining({ provider: 'STRIPE', config: { apiKey: 'sk_live_abc' } }),
    )
  })

  it('returns 201 on successful Google Calendar connection', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockIntegration = { id: 'int-2', provider: 'GOOGLE_CALENDAR', status: 'CONNECTED' }
    const { connectIntegration } = await import('@/services/integration.service')
    vi.mocked(connectIntegration).mockResolvedValue(mockIntegration as never)

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({
        provider: 'GOOGLE_CALENDAR',
        config: { clientId: 'gid', clientSecret: 'gsecret' },
      }) as never,
    )

    expect(response.status).toBe(201)
  })

  it('returns 201 on successful Webhook connection', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockIntegration = { id: 'int-3', provider: 'WEBHOOK', status: 'CONNECTED' }
    const { connectIntegration } = await import('@/services/integration.service')
    vi.mocked(connectIntegration).mockResolvedValue(mockIntegration as never)

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({
        provider: 'WEBHOOK',
        config: { url: 'https://example.com/hook' },
      }) as never,
    )

    expect(response.status).toBe(201)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { connectIntegration } = await import('@/services/integration.service')
    vi.mocked(connectIntegration).mockRejectedValue(new Error('DB error'))

    const { POST } = await import('@/app/api/integrations/route')
    const response = await POST(
      buildPostRequest({ provider: 'STRIPE', config: { apiKey: 'sk_live_abc' } }) as never,
    const { disconnectIntegration } = await import('@/services/integration.service')
    vi.mocked(disconnectIntegration).mockResolvedValue(undefined)

    const { DELETE } = await import('@/app/api/integrations/[id]/route')
    const response = await DELETE(
      buildDeleteRequest('int-1') as never,
      { params: Promise.resolve({ id: 'int-1' }) },
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Integration disconnected')
    expect(disconnectIntegration).toHaveBeenCalledWith(session.user.id, 'int-1')
  })

  it('returns 404 when integration not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { disconnectIntegration } = await import('@/services/integration.service')
    vi.mocked(disconnectIntegration).mockRejectedValue(new Error('Integration not found'))

    const { DELETE } = await import('@/app/api/integrations/[id]/route')
    const response = await DELETE(
      buildDeleteRequest('nonexistent') as never,
      { params: Promise.resolve({ id: 'nonexistent' }) },
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Integration not found')
  })

  it('returns 500 when service throws unexpected error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { disconnectIntegration } = await import('@/services/integration.service')
    vi.mocked(disconnectIntegration).mockRejectedValue(new Error('DB error'))

    const { DELETE } = await import('@/app/api/integrations/[id]/route')
    const response = await DELETE(
      buildDeleteRequest('int-1') as never,
      { params: Promise.resolve({ id: 'int-1' }) },
    )

    expect(response.status).toBe(500)
  })
})
