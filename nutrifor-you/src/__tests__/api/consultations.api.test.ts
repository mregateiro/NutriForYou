import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/consultation.service', () => ({
  listConsultations: vi.fn(),
  createConsultation: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/consultations')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/consultations', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/consultations/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns consultations list', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 'c1', patientId: 'p1', status: 'COMPLETED' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listConsultations } = await import('@/services/consultation.service')
    vi.mocked(listConsultations).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/consultations/route')
    const response = await GET(buildGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes query params to service', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const { listConsultations } = await import('@/services/consultation.service')
    vi.mocked(listConsultations).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 } as never)

    const { GET } = await import('@/app/api/consultations/route')
    await GET(buildGetRequest({ patientId: 'p1', status: 'DRAFT', page: '3' }) as never)

    expect(listConsultations).toHaveBeenCalledWith(
      session.user.id,
      expect.objectContaining({ patientId: 'p1', status: 'DRAFT', page: 3 }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listConsultations } = await import('@/services/consultation.service')
    vi.mocked(listConsultations).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/consultations/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(500)
  })
})

describe('POST /api/consultations', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/consultations/route')
    const response = await POST(buildPostRequest({ patientId: 'p1' }) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockConsultation = { id: 'c-new', patientId: 'p1', status: 'COMPLETED' }
    const { createConsultation } = await import('@/services/consultation.service')
    vi.mocked(createConsultation).mockResolvedValue(mockConsultation as never)

    const { POST } = await import('@/app/api/consultations/route')
    const response = await POST(buildPostRequest({ patientId: 'p1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockConsultation)
  })

  it('returns 400 on validation error (missing patientId)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/consultations/route')
    const response = await POST(buildPostRequest({}) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 on validation error (bodyFat > 100)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/consultations/route')
    const response = await POST(
      buildPostRequest({ patientId: 'p1', bodyFat: 150 }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 404 when patient not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createConsultation } = await import('@/services/consultation.service')
    vi.mocked(createConsultation).mockRejectedValue(new Error('Patient not found'))

    const { POST } = await import('@/app/api/consultations/route')
    const response = await POST(buildPostRequest({ patientId: 'nonexistent' }) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Patient not found')
  })

  it('returns 500 when service throws unexpected error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createConsultation } = await import('@/services/consultation.service')
    vi.mocked(createConsultation).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/consultations/route')
    const response = await POST(buildPostRequest({ patientId: 'p1' }) as never)

    expect(response.status).toBe(500)
  })
})
