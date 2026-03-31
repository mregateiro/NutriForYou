import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/chat.service', () => ({
  listConversations: vi.fn(),
  createConversation: vi.fn(),
}))

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/chat')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/chat ───────────────────────────────────────────────────
describe('GET /api/chat', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/chat/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(401)
  })

  it('returns 200 with conversations list', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = {
      data: [{ id: 'c1', title: 'Chat 1' }],
      total: 1,
      page: 1,
      perPage: 20,
    }
    const { listConversations } = await import('@/services/chat.service')
    vi.mocked(listConversations).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/chat/route')
    const response = await GET(buildGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('passes pagination params to service', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const { listConversations } = await import('@/services/chat.service')
    vi.mocked(listConversations).mockResolvedValue({ data: [], total: 0, page: 2, perPage: 10 } as never)

    const { GET } = await import('@/app/api/chat/route')
    await GET(buildGetRequest({ page: '2', perPage: '10' }) as never)

    expect(listConversations).toHaveBeenCalledWith(
      session.user.id,
      expect.objectContaining({ page: 2, perPage: 10 }),
    )
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listConversations } = await import('@/services/chat.service')
    vi.mocked(listConversations).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/chat/route')
    const response = await GET(buildGetRequest() as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/chat ──────────────────────────────────────────────────
describe('POST /api/chat', () => {
  const validConversation = {
    participantIds: ['user-2'],
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/chat/route')
    const response = await POST(buildPostRequest(validConversation) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockConversation = { id: 'c-new', ...validConversation }
    const { createConversation } = await import('@/services/chat.service')
    vi.mocked(createConversation).mockResolvedValue(mockConversation as never)

    const { POST } = await import('@/app/api/chat/route')
    const response = await POST(buildPostRequest(validConversation) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockConversation)
  })

  it('returns 400 on validation error (empty participantIds)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/chat/route')
    const response = await POST(buildPostRequest({ participantIds: [] }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createConversation } = await import('@/services/chat.service')
    vi.mocked(createConversation).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/chat/route')
    const response = await POST(buildPostRequest(validConversation) as never)

    expect(response.status).toBe(500)
  })
})
