import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/analytics.service', () => ({
  getDashboardAnalytics: vi.fn(),
  getPatientAnalytics: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/analytics')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString(), { method: 'GET' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/analytics', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns dashboard analytics for authenticated user', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockAnalytics = {
      patients: { total: 1, active: 1, newThisMonth: 0 },
      consultations: { total: 2, thisMonth: 1, completed: 1, completionRate: 50 },
      mealPlans: { total: 1, thisMonth: 0 },
      appointments: { upcoming: 0 },
      revenue: { total: 150, thisMonth: 0, pending: 0 },
      contracts: { active: 0 },
      recentConsultations: [],
      patientGrowth: [],
    }

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    vi.mocked(getDashboardAnalytics).mockResolvedValue(mockAnalytics as never)

    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(buildGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockAnalytics)
    expect(getDashboardAnalytics).toHaveBeenCalledWith(session.user.id)
  })

  it('returns patient analytics when patientId is provided', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockPatientAnalytics = {
      patient: { id: 'p-1', firstName: 'Jane', lastName: 'Doe', createdAt: new Date().toISOString() },
      consultations: 3,
      mealPlans: 1,
      contracts: 1,
      totalPaid: 450,
      lastConsultation: null,
      weightHistory: [],
    }

    const { getPatientAnalytics } = await import('@/services/analytics.service')
    vi.mocked(getPatientAnalytics).mockResolvedValue(mockPatientAnalytics as never)

    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(buildGetRequest({ patientId: 'p-1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockPatientAnalytics)
    expect(getPatientAnalytics).toHaveBeenCalledWith(session.user.id, 'p-1')
  })

  it('returns 404 when patient is not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { getPatientAnalytics } = await import('@/services/analytics.service')
    vi.mocked(getPatientAnalytics).mockRejectedValue(new Error('Patient not found'))

    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(buildGetRequest({ patientId: 'unknown' }) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Patient not found')
  })

  it('returns 500 on unexpected service error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    vi.mocked(getDashboardAnalytics).mockRejectedValue(new Error('DB failure'))

    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Internal server error')
  })
})
