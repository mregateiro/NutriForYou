import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/appointment.service', () => ({
  listAppointments: vi.fn(),
  createAppointment: vi.fn(),
  listAvailabilityRules: vi.fn(),
  createAvailabilityRule: vi.fn(),
  deleteAvailabilityRule: vi.fn(),
  getAvailableSlots: vi.fn(),
}))

function buildGetRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/appointments${path ? '/' + path : ''}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/appointments${path ? '/' + path : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildDeleteRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/appointments/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/appointments ───────────────────────────────────────────
describe('GET /api/appointments', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/appointments/route')
    const response = await GET(buildGetRequest('') as never)

    expect(response.status).toBe(401)
  })

  it('returns 200 with appointments list', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResult = { data: [{ id: 'a1', title: 'Checkup' }], total: 1, page: 1, perPage: 50 }
    const { listAppointments } = await import('@/services/appointment.service')
    vi.mocked(listAppointments).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/appointments/route')
    const response = await GET(buildGetRequest('') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listAppointments } = await import('@/services/appointment.service')
    vi.mocked(listAppointments).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/appointments/route')
    const response = await GET(buildGetRequest('') as never)

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/appointments ──────────────────────────────────────────
describe('POST /api/appointments', () => {
  const validAppointment = {
    patientId: 'p1',
    startsAt: '2025-01-15T10:00:00Z',
    endsAt: '2025-01-15T11:00:00Z',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/appointments/route')
    const response = await POST(buildPostRequest('', validAppointment) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockAppointment = { id: 'a-new', ...validAppointment }
    const { createAppointment } = await import('@/services/appointment.service')
    vi.mocked(createAppointment).mockResolvedValue(mockAppointment as never)

    const { POST } = await import('@/app/api/appointments/route')
    const response = await POST(buildPostRequest('', validAppointment) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockAppointment)
  })

  it('returns 400 on validation error (missing patientId)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/appointments/route')
    const response = await POST(
      buildPostRequest('', { startsAt: '2025-01-15T10:00:00Z', endsAt: '2025-01-15T11:00:00Z' }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createAppointment } = await import('@/services/appointment.service')
    vi.mocked(createAppointment).mockRejectedValue(new Error('Unexpected'))

    const { POST } = await import('@/app/api/appointments/route')
    const response = await POST(buildPostRequest('', validAppointment) as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/appointments/availability ──────────────────────────────
describe('GET /api/appointments/availability', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/appointments/availability/route')
    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('returns 200 with availability rules', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockRules = [{ id: 'r1', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' }]
    const { listAvailabilityRules } = await import('@/services/appointment.service')
    vi.mocked(listAvailabilityRules).mockResolvedValue(mockRules as never)

    const { GET } = await import('@/app/api/appointments/availability/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockRules)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { listAvailabilityRules } = await import('@/services/appointment.service')
    vi.mocked(listAvailabilityRules).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/appointments/availability/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/appointments/availability ─────────────────────────────
describe('POST /api/appointments/availability', () => {
  const validRule = {
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
  }

  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/appointments/availability/route')
    const response = await POST(buildPostRequest('availability', validRule) as never)

    expect(response.status).toBe(401)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockRule = { id: 'r-new', ...validRule }
    const { createAvailabilityRule } = await import('@/services/appointment.service')
    vi.mocked(createAvailabilityRule).mockResolvedValue(mockRule as never)

    const { POST } = await import('@/app/api/appointments/availability/route')
    const response = await POST(buildPostRequest('availability', validRule) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockRule)
  })

  it('returns 400 on validation error (invalid time format)', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/appointments/availability/route')
    const response = await POST(
      buildPostRequest('availability', { dayOfWeek: 'MONDAY', startTime: 'nine', endTime: '17:00' }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { createAvailabilityRule } = await import('@/services/appointment.service')
    vi.mocked(createAvailabilityRule).mockRejectedValue(new Error('DB error'))

    const { POST } = await import('@/app/api/appointments/availability/route')
    const response = await POST(buildPostRequest('availability', validRule) as never)

    expect(response.status).toBe(500)
  })
})

// ─── DELETE /api/appointments/availability ───────────────────────────
describe('DELETE /api/appointments/availability', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/appointments/availability/route')
    const response = await DELETE(buildDeleteRequest('availability', { id: 'r1' }) as never)

    expect(response.status).toBe(401)
  })

  it('returns 400 when id is missing', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { DELETE } = await import('@/app/api/appointments/availability/route')
    const response = await DELETE(buildDeleteRequest('availability') as never)

    expect(response.status).toBe(400)
  })

  it('returns 200 on successful deletion', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const { deleteAvailabilityRule } = await import('@/services/appointment.service')
    vi.mocked(deleteAvailabilityRule).mockResolvedValue(undefined as never)

    const { DELETE } = await import('@/app/api/appointments/availability/route')
    const response = await DELETE(buildDeleteRequest('availability', { id: 'r1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Availability rule deleted')
  })

  it('returns 404 when rule not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { deleteAvailabilityRule } = await import('@/services/appointment.service')
    vi.mocked(deleteAvailabilityRule).mockRejectedValue(new Error('Availability rule not found'))

    const { DELETE } = await import('@/app/api/appointments/availability/route')
    const response = await DELETE(buildDeleteRequest('availability', { id: 'r1' }) as never)

    expect(response.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { deleteAvailabilityRule } = await import('@/services/appointment.service')
    vi.mocked(deleteAvailabilityRule).mockRejectedValue(new Error('Unexpected'))

    const { DELETE } = await import('@/app/api/appointments/availability/route')
    const response = await DELETE(buildDeleteRequest('availability', { id: 'r1' }) as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/appointments/slots ─────────────────────────────────────
describe('GET /api/appointments/slots', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/appointments/slots/route')
    const response = await GET(buildGetRequest('slots', { date: '2025-01-15' }) as never)

    expect(response.status).toBe(401)
  })

  it('returns 400 when date is missing', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { GET } = await import('@/app/api/appointments/slots/route')
    const response = await GET(buildGetRequest('slots') as never)

    expect(response.status).toBe(400)
  })

  it('returns 200 with available slots', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockSlots = [{ start: '09:00', end: '10:00' }]
    const { getAvailableSlots } = await import('@/services/appointment.service')
    vi.mocked(getAvailableSlots).mockResolvedValue(mockSlots as never)

    const { GET } = await import('@/app/api/appointments/slots/route')
    const response = await GET(buildGetRequest('slots', { date: '2025-01-15' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockSlots)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { getAvailableSlots } = await import('@/services/appointment.service')
    vi.mocked(getAvailableSlots).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/appointments/slots/route')
    const response = await GET(buildGetRequest('slots', { date: '2025-01-15' }) as never)

    expect(response.status).toBe(500)
  })
})
