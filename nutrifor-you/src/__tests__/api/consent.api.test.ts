import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/consent.service', () => ({
  getConsents: vi.fn(),
  getConsentHistory: vi.fn(),
  grantConsent: vi.fn(),
  exportUserData: vi.fn(),
  requestDataErasure: vi.fn(),
}))

function buildGetRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/consent${path ? '/' + path : ''}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/consent${path ? '/' + path : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/consent ────────────────────────────────────────────────
describe('GET /api/consent', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/consent/route')
    const response = await GET(buildGetRequest('') as never)

    expect(response.status).toBe(401)
  })

  it('returns 200 with consents', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockConsents = [{ id: 'cn1', purpose: 'DATA_PROCESSING', granted: true }]
    const { getConsents } = await import('@/services/consent.service')
    vi.mocked(getConsents).mockResolvedValue(mockConsents as never)

    const { GET } = await import('@/app/api/consent/route')
    const response = await GET(buildGetRequest('') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockConsents)
  })

  it('returns consent history when history=true', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockHistory = [{ id: 'cn1', purpose: 'DATA_PROCESSING', version: '1.0' }]
    const { getConsentHistory } = await import('@/services/consent.service')
    vi.mocked(getConsentHistory).mockResolvedValue(mockHistory as never)

    const { GET } = await import('@/app/api/consent/route')
    const response = await GET(buildGetRequest('', { history: 'true' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockHistory)
    expect(getConsentHistory).toHaveBeenCalledWith(session.user.id)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { getConsents } = await import('@/services/consent.service')
    vi.mocked(getConsents).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/consent/route')
    const response = await GET(buildGetRequest('') as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/consent ───────────────────────────────────────────────
describe('POST /api/consent', () => {
  const validConsent = {
    purpose: 'DATA_PROCESSING',
    granted: true,
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/consent/route')
    const response = await POST(buildPostRequest('', validConsent) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful consent grant', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockConsent = { id: 'cn-new', ...validConsent }
    const { grantConsent } = await import('@/services/consent.service')
    vi.mocked(grantConsent).mockResolvedValue(mockConsent as never)

    const { POST } = await import('@/app/api/consent/route')
    const response = await POST(buildPostRequest('', validConsent) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockConsent)
  })

  it('returns 400 on validation error (invalid purpose)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/consent/route')
    const response = await POST(
      buildPostRequest('', { purpose: 'INVALID', granted: true }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { grantConsent } = await import('@/services/consent.service')
    vi.mocked(grantConsent).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/consent/route')
    const response = await POST(buildPostRequest('', validConsent) as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/consent/export ─────────────────────────────────────────
describe('GET /api/consent/export', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/consent/export/route')
    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('returns 200 with exported data', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockData = { user: { id: 'u1' }, consents: [] }
    const { exportUserData } = await import('@/services/consent.service')
    vi.mocked(exportUserData).mockResolvedValue(mockData as never)

    const { GET } = await import('@/app/api/consent/export/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockData)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { exportUserData } = await import('@/services/consent.service')
    vi.mocked(exportUserData).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/consent/export/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/consent/erasure ───────────────────────────────────────
describe('POST /api/consent/erasure', () => {
  const validErasure = {
    confirmEmail: 'test@example.com',
    reason: 'No longer needed',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/consent/erasure/route')
    const response = await POST(buildPostRequest('erasure', validErasure) as never)

    expect(response.status).toBe(401)
  })

  it('returns 200 on successful erasure request', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = { status: 'PENDING', requestedAt: new Date().toISOString() }
    const { requestDataErasure } = await import('@/services/consent.service')
    vi.mocked(requestDataErasure).mockResolvedValue(mockResult as never)

    const { POST } = await import('@/app/api/consent/erasure/route')
    const response = await POST(buildPostRequest('erasure', validErasure) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockResult)
  })

  it('returns 400 on validation error (invalid email)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/consent/erasure/route')
    const response = await POST(
      buildPostRequest('erasure', { confirmEmail: 'not-an-email' }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 400 when email confirmation does not match', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { requestDataErasure } = await import('@/services/consent.service')
    vi.mocked(requestDataErasure).mockRejectedValue(
      new Error('Email confirmation does not match'),
    )

    const { POST } = await import('@/app/api/consent/erasure/route')
    const response = await POST(buildPostRequest('erasure', validErasure) as never)

    expect(response.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { requestDataErasure } = await import('@/services/consent.service')
    vi.mocked(requestDataErasure).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/consent/erasure/route')
    const response = await POST(buildPostRequest('erasure', validErasure) as never)

    expect(response.status).toBe(500)
  })
})
