import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/notification.service', () => ({
  listNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/notifications')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPatchRequest() {
  return new Request('http://localhost/api/notifications', {
    method: 'PATCH',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/notifications ──────────────────────────────────────────
describe('GET /api/notifications', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/notifications/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with notifications list', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 'n1', message: 'New appointment', read: false }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listNotifications } = await import('@/services/notification.service')
    vi.mocked(listNotifications).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/notifications/route')
    const response = await GET(buildGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listNotifications } = await import('@/services/notification.service')
    vi.mocked(listNotifications).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/notifications/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(500)
  })
})

// ─── PATCH /api/notifications ────────────────────────────────────────
describe('PATCH /api/notifications', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { PATCH } = await import('@/app/api/notifications/route')
    const response = await PATCH()

    expect(response.status).toBe(401)
  })

  it('returns 200 on successful mark all read', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const { markAllNotificationsRead } = await import('@/services/notification.service')
    vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined as never)

    const { PATCH } = await import('@/app/api/notifications/route')
    const response = await PATCH()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('All notifications marked as read')
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { markAllNotificationsRead } = await import('@/services/notification.service')
    vi.mocked(markAllNotificationsRead).mockRejectedValue(new Error('DB error'))

    const { PATCH } = await import('@/app/api/notifications/route')
    const response = await PATCH()

    expect(response.status).toBe(500)
  })
})
