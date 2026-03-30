import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockSession, createMockAdminSession } from '../helpers/mock-session'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/audit.service', () => ({
  getAuditLogs: vi.fn(),
  createAuditLog: vi.fn(),
}))

vi.mock('@/services/admin.service', () => ({
  getSystemStats: vi.fn(),
  listUsers: vi.fn(),
  listFeatureFlags: vi.fn(),
  createFeatureFlag: vi.fn(),
}))

vi.mock('@/services/compliance.service', () => ({
  getComplianceStatus: vi.fn(),
  enforceRetentionPolicies: vi.fn(),
  reportBreach: vi.fn(),
  listBreachReports: vi.fn(),
}))

vi.mock('@/services/organization.service', () => ({
  getOrganization: vi.fn(),
  updateOrganization: vi.fn(),
}))

function buildGetRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/admin/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString(), { method: 'GET' })
}

function buildPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/admin/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildPatchRequest(path: string, body: unknown) {
  return new Request(`http://localhost/api/admin/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/admin/audit-logs ───────────────────────────────────────
describe('GET /api/admin/audit-logs', () => {
  it('returns 403 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/audit-logs/route')
    const response = await GET(buildGetRequest('audit-logs') as never)

    expect(response.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { GET } = await import('@/app/api/admin/audit-logs/route')
    const response = await GET(buildGetRequest('audit-logs') as never)

    expect(response.status).toBe(403)
  })

  it('returns 200 with audit logs for admin', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const mockResult = { data: [{ id: 'log1' }], total: 1, page: 1, perPage: 50 }
    const { getAuditLogs } = await import('@/services/audit.service')
    vi.mocked(getAuditLogs).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/admin/audit-logs/route')
    const response = await GET(buildGetRequest('audit-logs') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { getAuditLogs } = await import('@/services/audit.service')
    vi.mocked(getAuditLogs).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/audit-logs/route')
    const response = await GET(buildGetRequest('audit-logs') as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/admin/stats ────────────────────────────────────────────
describe('GET /api/admin/stats', () => {
  it('returns 403 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/stats/route')
    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { GET } = await import('@/app/api/admin/stats/route')
    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('returns 200 with system stats for admin', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const mockStats = { totalUsers: 100, activeSubscriptions: 50 }
    const { getSystemStats } = await import('@/services/admin.service')
    vi.mocked(getSystemStats).mockResolvedValue(mockStats as never)

    const { GET } = await import('@/app/api/admin/stats/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ data: mockStats })
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { getSystemStats } = await import('@/services/admin.service')
    vi.mocked(getSystemStats).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/stats/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/admin/users ────────────────────────────────────────────
describe('GET /api/admin/users', () => {
  it('returns 403 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/users/route')
    const response = await GET(buildGetRequest('users') as never)

    expect(response.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { GET } = await import('@/app/api/admin/users/route')
    const response = await GET(buildGetRequest('users') as never)

    expect(response.status).toBe(403)
  })

  it('returns 200 with users list for admin', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const mockResult = { data: [{ id: 'u1', name: 'Admin' }], total: 1, page: 1, perPage: 20 }
    const { listUsers } = await import('@/services/admin.service')
    vi.mocked(listUsers).mockResolvedValue(mockResult as never)

    const { GET } = await import('@/app/api/admin/users/route')
    const response = await GET(buildGetRequest('users') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockResult)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { listUsers } = await import('@/services/admin.service')
    vi.mocked(listUsers).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/users/route')
    const response = await GET(buildGetRequest('users') as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/admin/feature-flags ────────────────────────────────────
describe('GET /api/admin/feature-flags', () => {
  it('returns 403 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/feature-flags/route')
    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { GET } = await import('@/app/api/admin/feature-flags/route')
    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('returns 200 with feature flags for admin', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const mockFlags = [{ id: 'f1', key: 'dark-mode', isEnabled: true }]
    const { listFeatureFlags } = await import('@/services/admin.service')
    vi.mocked(listFeatureFlags).mockResolvedValue(mockFlags as never)

    const { GET } = await import('@/app/api/admin/feature-flags/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ data: mockFlags })
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { listFeatureFlags } = await import('@/services/admin.service')
    vi.mocked(listFeatureFlags).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/feature-flags/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/admin/feature-flags ───────────────────────────────────
describe('POST /api/admin/feature-flags', () => {
  const validFlag = { key: 'new-feature', name: 'New Feature' }

  it('returns 403 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/admin/feature-flags/route')
    const response = await POST(buildPostRequest('feature-flags', validFlag) as never)

    expect(response.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { POST } = await import('@/app/api/admin/feature-flags/route')
    const response = await POST(buildPostRequest('feature-flags', validFlag) as never)

    expect(response.status).toBe(403)
  })

  it('returns 201 on successful creation', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockAdminSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockFlag = { id: 'f-new', ...validFlag }
    const { createFeatureFlag } = await import('@/services/admin.service')
    vi.mocked(createFeatureFlag).mockResolvedValue(mockFlag as never)

    const { POST } = await import('@/app/api/admin/feature-flags/route')
    const response = await POST(buildPostRequest('feature-flags', validFlag) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockFlag)
  })

  it('returns 400 on validation error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { POST } = await import('@/app/api/admin/feature-flags/route')
    const response = await POST(buildPostRequest('feature-flags', { key: '' }) as never)

    expect(response.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { createFeatureFlag } = await import('@/services/admin.service')
    vi.mocked(createFeatureFlag).mockRejectedValue(new Error('DB error'))

    const { POST } = await import('@/app/api/admin/feature-flags/route')
    const response = await POST(buildPostRequest('feature-flags', validFlag) as never)

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/admin/compliance ───────────────────────────────────────
describe('GET /api/admin/compliance', () => {
  it('returns 403 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/compliance/route')
    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { GET } = await import('@/app/api/admin/compliance/route')
    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('returns 200 with compliance status for admin', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const mockStatus = { gdprCompliant: true }
    const mockBreaches: never[] = []
    const { getComplianceStatus } = await import('@/services/compliance.service')
    const { listBreachReports } = await import('@/services/compliance.service')
    vi.mocked(getComplianceStatus).mockResolvedValue(mockStatus as never)
    vi.mocked(listBreachReports).mockResolvedValue(mockBreaches as never)

    const { GET } = await import('@/app/api/admin/compliance/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual({ ...mockStatus, breachReports: mockBreaches })
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { getComplianceStatus } = await import('@/services/compliance.service')
    vi.mocked(getComplianceStatus).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/compliance/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ─── POST /api/admin/compliance ──────────────────────────────────────
describe('POST /api/admin/compliance', () => {
  it('returns 403 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/admin/compliance/route')
    const response = await POST(
      buildPostRequest('compliance', { action: 'enforce-retention' }) as never,
    )

    expect(response.status).toBe(403)
  })

  it('returns 200 for enforce-retention action', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockAdminSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockResults = { deletedRecords: 5 }
    const { enforceRetentionPolicies } = await import('@/services/compliance.service')
    vi.mocked(enforceRetentionPolicies).mockResolvedValue(mockResults as never)

    const { POST } = await import('@/app/api/admin/compliance/route')
    const response = await POST(
      buildPostRequest('compliance', { action: 'enforce-retention' }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockResults)
  })

  it('returns 201 for report-breach action', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockAdminSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockReport = { id: 'b1', severity: 'HIGH' }
    const { reportBreach } = await import('@/services/compliance.service')
    vi.mocked(reportBreach).mockResolvedValue(mockReport as never)

    const { POST } = await import('@/app/api/admin/compliance/route')
    const response = await POST(
      buildPostRequest('compliance', {
        action: 'report-breach',
        severity: 'HIGH',
        description: 'Data leak',
        affectedUsers: 10,
      }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toEqual(mockReport)
  })

  it('returns 400 for report-breach missing required fields', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { POST } = await import('@/app/api/admin/compliance/route')
    const response = await POST(
      buildPostRequest('compliance', { action: 'report-breach' }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid action', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { POST } = await import('@/app/api/admin/compliance/route')
    const response = await POST(
      buildPostRequest('compliance', { action: 'unknown' }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockAdminSession())

    const { enforceRetentionPolicies } = await import('@/services/compliance.service')
    vi.mocked(enforceRetentionPolicies).mockRejectedValue(new Error('DB error'))

    const { POST } = await import('@/app/api/admin/compliance/route')
    const response = await POST(
      buildPostRequest('compliance', { action: 'enforce-retention' }) as never,
    )

    expect(response.status).toBe(500)
  })
})

// ─── GET /api/admin/organization ─────────────────────────────────────
describe('GET /api/admin/organization', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/organization/route')
    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('returns 200 with organization data', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockOrg = { id: 'org1', name: 'Test Org' }
    const { getOrganization } = await import('@/services/organization.service')
    vi.mocked(getOrganization).mockResolvedValue(mockOrg as never)

    const { GET } = await import('@/app/api/admin/organization/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockOrg)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { getOrganization } = await import('@/services/organization.service')
    vi.mocked(getOrganization).mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/organization/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})

// ─── PATCH /api/admin/organization ───────────────────────────────────
describe('PATCH /api/admin/organization', () => {
  it('returns 401 without session', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { PATCH } = await import('@/app/api/admin/organization/route')
    const response = await PATCH(buildPatchRequest('organization', { name: 'New' }) as never)

    expect(response.status).toBe(401)
  })

  it('returns 200 on successful update', async () => {
    const { getServerSession } = await import('next-auth')
    const session = createMockSession()
    vi.mocked(getServerSession).mockResolvedValue(session)

    const mockOrg = { id: 'org1', name: 'Updated Org' }
    const { updateOrganization } = await import('@/services/organization.service')
    vi.mocked(updateOrganization).mockResolvedValue(mockOrg as never)

    const { PATCH } = await import('@/app/api/admin/organization/route')
    const response = await PATCH(buildPatchRequest('organization', { name: 'Updated Org' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockOrg)
  })

  it('returns 400 on validation error', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { PATCH } = await import('@/app/api/admin/organization/route')
    const response = await PATCH(
      buildPatchRequest('organization', { primaryColor: 'not-a-color' }) as never,
    )

    expect(response.status).toBe(400)
  })

  it('returns 404 when organization not found', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { updateOrganization } = await import('@/services/organization.service')
    vi.mocked(updateOrganization).mockRejectedValue(new Error('No organization found'))

    const { PATCH } = await import('@/app/api/admin/organization/route')
    const response = await PATCH(buildPatchRequest('organization', { name: 'X' }) as never)

    expect(response.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(createMockSession())

    const { updateOrganization } = await import('@/services/organization.service')
    vi.mocked(updateOrganization).mockRejectedValue(new Error('Unexpected'))

    const { PATCH } = await import('@/app/api/admin/organization/route')
    const response = await PATCH(buildPatchRequest('organization', { name: 'X' }) as never)

    expect(response.status).toBe(500)
  })
})
