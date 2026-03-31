import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/services/subscription.service', () => ({
  getSubscription: vi.fn(),
  changeSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  confirmSubscriptionPayment: vi.fn(),
  PRICING: {
    LITE: { monthly: 9.90, annual: 99.00, currency: 'EUR' },
    PREMIUM: { monthly: 24.90, annual: 249.00, currency: 'EUR' },
    BUSINESS: { monthly: 49.90, annual: 499.00, currency: 'EUR' },
  },
}))

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildDeleteRequest(body: unknown) {
  return new Request('http://localhost/api/subscription', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/subscription', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/subscription/route')
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns subscription with pricing', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockSub = { id: 'sub-1', tier: 'PREMIUM', status: 'ACTIVE' }
    const { getSubscription } = await import('@/services/subscription.service')
    vi.mocked(getSubscription).mockResolvedValue(mockSub as never)

    const { GET } = await import('@/app/api/subscription/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.subscription).toEqual(mockSub)
    expect(data.data.pricing).toBeDefined()
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { getSubscription } = await import('@/services/subscription.service')
    vi.mocked(getSubscription).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/subscription/route')
    const response = await GET()
    expect(response.status).toBe(500)
  })
})

describe('POST /api/subscription', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/subscription/route')
    const response = await POST(buildPostRequest({ tier: 'PREMIUM' }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 200 on successful subscription change', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockSub = { id: 'sub-1', tier: 'PREMIUM', status: 'PAST_DUE' }
    const { changeSubscription } = await import('@/services/subscription.service')
    vi.mocked(changeSubscription).mockResolvedValue(mockSub as never)

    const { POST } = await import('@/app/api/subscription/route')
    const response = await POST(buildPostRequest({ tier: 'PREMIUM', billingCycle: 'MONTHLY' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockSub)
    expect(data.requiresPayment).toBe(true)
    expect(data.paymentDetails.amount).toBe(24.90)
  })

  it('returns 400 on validation error (invalid tier)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/subscription/route')
    const response = await POST(buildPostRequest({ tier: 'INVALID' }) as never)
    expect(response.status).toBe(400)
  })

  it('handles confirm_payment action', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockSub = { id: 'sub-1', tier: 'PREMIUM', status: 'ACTIVE' }
    const { confirmSubscriptionPayment } = await import('@/services/subscription.service')
    vi.mocked(confirmSubscriptionPayment).mockResolvedValue(mockSub as never)

    const { POST } = await import('@/app/api/subscription/route')
    const response = await POST(buildPostRequest({ action: 'confirm_payment', paymentMethod: 'credit_card' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockSub)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { changeSubscription } = await import('@/services/subscription.service')
    vi.mocked(changeSubscription).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/subscription/route')
    const response = await POST(buildPostRequest({ tier: 'PREMIUM' }) as never)
    expect(response.status).toBe(500)
  })
})

describe('DELETE /api/subscription', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/subscription/route')
    const response = await DELETE(buildDeleteRequest({}) as never)
    expect(response.status).toBe(401)
  })

  it('returns 200 on successful cancellation', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockSub = { id: 'sub-1', status: 'CANCELED' }
    const { cancelSubscription } = await import('@/services/subscription.service')
    vi.mocked(cancelSubscription).mockResolvedValue(mockSub as never)

    const { DELETE } = await import('@/app/api/subscription/route')
    const response = await DELETE(buildDeleteRequest({ reason: 'Too expensive' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockSub)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { cancelSubscription } = await import('@/services/subscription.service')
    vi.mocked(cancelSubscription).mockRejectedValue(new Error('Unexpected'))

    const { DELETE } = await import('@/app/api/subscription/route')
    const response = await DELETE(buildDeleteRequest({}) as never)
    expect(response.status).toBe(500)
  })
})
