import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/services/payment.service', () => ({
  listInvoices: vi.fn(),
  createInvoice: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/invoices')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/invoices', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/invoices/route')
    const response = await GET(buildGetRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns invoices list', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockResult = { data: [{ id: 'inv-1' }], pagination: { page: 1, perPage: 20, total: 1, totalPages: 1 } }
    const { listInvoices } = await import('@/services/payment.service')
    vi.mocked(listInvoices).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/invoices/route')
    const response = await GET(buildGetRequest() as never)
    expect(response.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listInvoices } = await import('@/services/payment.service')
    vi.mocked(listInvoices).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/invoices/route')
    const response = await GET(buildGetRequest() as never)
    expect(response.status).toBe(500)
  })
})

describe('POST /api/invoices', () => {
  const validInvoice = {
    items: [
      { description: 'Consultation fee', quantity: 1, unitPrice: 150.00 },
    ],
    tax: 23,
    currency: 'EUR',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/invoices/route')
    const response = await POST(buildPostRequest(validInvoice) as never)
    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockInvoice = { id: 'inv-new', ...validInvoice }
    const { createInvoice } = await import('@/services/payment.service')
    vi.mocked(createInvoice).mockResolvedValue(mockInvoice as never)

    const { POST } = await import('@/app/api/invoices/route')
    const response = await POST(buildPostRequest(validInvoice) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockInvoice)
  })

  it('returns 400 on validation error (empty items)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/invoices/route')
    const response = await POST(buildPostRequest({ items: [] }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createInvoice } = await import('@/services/payment.service')
    vi.mocked(createInvoice).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/invoices/route')
    const response = await POST(buildPostRequest(validInvoice) as never)
    expect(response.status).toBe(500)
  })
})
