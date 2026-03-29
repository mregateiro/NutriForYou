import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/meal-plan.service', () => ({
  listMealPlans: vi.fn(),
  createMealPlan: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/meal-plans')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/meal-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/meal-plans', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/meal-plans/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns meal plans list', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 'mp1', title: 'Weekly Plan', patientId: 'p1' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listMealPlans } = await import('@/services/meal-plan.service')
    vi.mocked(listMealPlans).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/meal-plans/route')
    const response = await GET(buildGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes query params to service', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const { listMealPlans } = await import('@/services/meal-plan.service')
    vi.mocked(listMealPlans).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 } as never)

    const { GET } = await import('@/app/api/meal-plans/route')
    await GET(buildGetRequest({ patientId: 'p1', status: 'ACTIVE', page: '2' }) as never)

    expect(listMealPlans).toHaveBeenCalledWith(
      session.user.id,
      expect.objectContaining({ patientId: 'p1', status: 'ACTIVE', page: 2 }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listMealPlans } = await import('@/services/meal-plan.service')
    vi.mocked(listMealPlans).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/meal-plans/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(500)
  })
})

describe('POST /api/meal-plans', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/meal-plans/route')
    const response = await POST(
      buildPostRequest({ patientId: 'p1', title: 'Plan' }) as never,
    )

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockMealPlan = { id: 'mp-new', title: 'Weekly Plan', patientId: 'p1' }
    const { createMealPlan } = await import('@/services/meal-plan.service')
    vi.mocked(createMealPlan).mockResolvedValue(mockMealPlan as never)

    const { POST } = await import('@/app/api/meal-plans/route')
    const response = await POST(
      buildPostRequest({ patientId: 'p1', title: 'Weekly Plan' }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockMealPlan)
  })

  it('returns 400 on validation error (missing patientId)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/meal-plans/route')
    const response = await POST(buildPostRequest({ title: 'Plan' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 on validation error (missing title)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/meal-plans/route')
    const response = await POST(buildPostRequest({ patientId: 'p1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 on validation error (title too long)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/meal-plans/route')
    const response = await POST(
      buildPostRequest({ patientId: 'p1', title: 'x'.repeat(201) }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 404 when patient not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createMealPlan } = await import('@/services/meal-plan.service')
    vi.mocked(createMealPlan).mockRejectedValue(new Error('Patient not found'))

    const { POST } = await import('@/app/api/meal-plans/route')
    const response = await POST(
      buildPostRequest({ patientId: 'nonexistent', title: 'Plan' }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Patient not found')
  })

  it('returns 500 when service throws unexpected error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createMealPlan } = await import('@/services/meal-plan.service')
    vi.mocked(createMealPlan).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/meal-plans/route')
    const response = await POST(
      buildPostRequest({ patientId: 'p1', title: 'Plan' }) as never,
    )

    expect(response.status).toBe(500)
  })
})
