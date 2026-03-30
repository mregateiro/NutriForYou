import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/payment.service', () => ({
  listPayments: vi.fn(),
  createPayment: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/payments')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/payments ───────────────────────────────────────────────
describe('GET /api/payments', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/payments/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with payments list', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 'pay1', amount: 200, status: 'COMPLETED' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listPayments } = await import('@/services/payment.service')
    vi.mocked(listPayments).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/payments/route')
    const response = await GET(buildGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes query params to service', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const { listPayments } = await import('@/services/payment.service')
    vi.mocked(listPayments).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 } as never)

    const { GET } = await import('@/app/api/payments/route')
    await GET(buildGetRequest({ patientId: 'p1', status: 'COMPLETED' }) as never)

    expect(listPayments).toHaveBeenCalledWith(
      session.user.id,
      expect.objectContaining({ patientId: 'p1', status: 'COMPLETED' }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listPayments } = await import('@/services/payment.service')
    vi.mocked(listPayments).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/payments/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/payments ──────────────────────────────────────────────
describe('POST /api/payments', () => {
  const validPayment = {
    patientId: 'p1',
    amount: 200,
    method: 'CREDIT_CARD',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/payments/route')
    const response = await POST(buildPostRequest(validPayment) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockPayment = { id: 'pay-new', ...validPayment }
    const { createPayment } = await import('@/services/payment.service')
    vi.mocked(createPayment).mockResolvedValue(mockPayment as never)

    const { POST } = await import('@/app/api/payments/route')
    const response = await POST(buildPostRequest(validPayment) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockPayment)
  })

  it('returns 400 on validation error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/payments/route')
    const response = await POST(buildPostRequest({}) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 404 when patient not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createPayment } = await import('@/services/payment.service')
    vi.mocked(createPayment).mockRejectedValue(new Error('Patient not found'))

    const { POST } = await import('@/app/api/payments/route')
    const response = await POST(buildPostRequest(validPayment) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Patient not found')
  })

  it('returns 500 when service throws unexpected error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createPayment } = await import('@/services/payment.service')
    vi.mocked(createPayment).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/payments/route')
    const response = await POST(buildPostRequest(validPayment) as never)

    expect(response.status).toBe(500)
  })
})
