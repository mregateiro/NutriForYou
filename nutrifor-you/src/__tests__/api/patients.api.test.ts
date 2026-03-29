import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/patient.service', () => ({
  searchPatients: vi.fn(),
  createPatient: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/patients')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/patients', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/patients/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns patients list with pagination', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 'p1', firstName: 'Jane', lastName: 'Doe' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { searchPatients } = await import('@/services/patient.service')
    vi.mocked(searchPatients).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/patients/route')
    const response = await GET(buildGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes search query to service', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const { searchPatients } = await import('@/services/patient.service')
    vi.mocked(searchPatients).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 } as never)

    const { GET } = await import('@/app/api/patients/route')
    await GET(buildGetRequest({ query: 'john', page: '2' }) as never)

    expect(searchPatients).toHaveBeenCalledWith(
      session.user.id,
      expect.objectContaining({ query: 'john', page: 2 }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { searchPatients } = await import('@/services/patient.service')
    vi.mocked(searchPatients).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/patients/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(500)
  })
})

describe('POST /api/patients', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/patients/route')
    const response = await POST(buildPostRequest({ firstName: 'A', lastName: 'B' }) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockPatient = { id: 'p-new', firstName: 'Jane', lastName: 'Doe' }
    const { createPatient } = await import('@/services/patient.service')
    vi.mocked(createPatient).mockResolvedValue(mockPatient as never)

    const { POST } = await import('@/app/api/patients/route')
    const response = await POST(
      buildPostRequest({ firstName: 'Jane', lastName: 'Doe' }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockPatient)
  })

  it('returns 400 on validation error (missing firstName)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/patients/route')
    const response = await POST(buildPostRequest({ lastName: 'Doe' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 on validation error (negative weight)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/patients/route')
    const response = await POST(
      buildPostRequest({ firstName: 'Jane', lastName: 'Doe', weight: -5 }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createPatient } = await import('@/services/patient.service')
    vi.mocked(createPatient).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/patients/route')
    const response = await POST(
      buildPostRequest({ firstName: 'Jane', lastName: 'Doe' }) as never,
    )

    expect(response.status).toBe(500)
  })
})
