import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/services/contract.service', () => ({
  listContracts: vi.fn(),
  createContract: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/contracts')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/contracts', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/contracts/route')
    const response = await GET(buildGetRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns contracts list', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockResult = { data: [{ id: 'c1', title: 'Contract 1' }], pagination: { page: 1, perPage: 20, total: 1, totalPages: 1 } }
    const { listContracts } = await import('@/services/contract.service')
    vi.mocked(listContracts).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/contracts/route')
    const response = await GET(buildGetRequest() as never)
    expect(response.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listContracts } = await import('@/services/contract.service')
    vi.mocked(listContracts).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/contracts/route')
    const response = await GET(buildGetRequest() as never)
    expect(response.status).toBe(500)
  })
})

describe('POST /api/contracts', () => {
  const validContract = {
    patientId: 'patient-1',
    title: 'Service Agreement',
    content: 'Terms and conditions...',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/contracts/route')
    const response = await POST(buildPostRequest(validContract) as never)
    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const mockContract = { id: 'c-new', ...validContract }
    const { createContract } = await import('@/services/contract.service')
    vi.mocked(createContract).mockResolvedValue(mockContract as never)

    const { POST } = await import('@/app/api/contracts/route')
    const response = await POST(buildPostRequest(validContract) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockContract)
  })

  it('returns 400 on validation error (missing title)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/contracts/route')
    const response = await POST(buildPostRequest({ patientId: 'p1', content: 'text' }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 404 when patient not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createContract } = await import('@/services/contract.service')
    vi.mocked(createContract).mockRejectedValue(new Error('Patient not found'))

    const { POST } = await import('@/app/api/contracts/route')
    const response = await POST(buildPostRequest(validContract) as never)
    expect(response.status).toBe(404)
  })

  it('returns 500 when service throws unexpected error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createContract } = await import('@/services/contract.service')
    vi.mocked(createContract).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/contracts/route')
    const response = await POST(buildPostRequest(validContract) as never)
    expect(response.status).toBe(500)
  })
})
