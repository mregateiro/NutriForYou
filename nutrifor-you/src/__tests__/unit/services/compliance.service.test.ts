import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getRetentionPolicies
// ---------------------------------------------------------------------------
describe('getRetentionPolicies', () => {
  it('returns 4 default retention policies', async () => {
    const { getRetentionPolicies } = await import('@/services/compliance.service')
    const policies = getRetentionPolicies()

    expect(policies).toHaveLength(4)
    expect(policies).toEqual([
      { entity: 'AuditLog', retentionDays: 365, description: 'Audit logs retained for 1 year' },
      { entity: 'Notification', retentionDays: 90, description: 'Notifications retained for 90 days' },
      { entity: 'ChatMessage', retentionDays: 730, description: 'Chat messages retained for 2 years' },
      { entity: 'Session', retentionDays: 30, description: 'User sessions retained for 30 days' },
    ])
  })
})

// ---------------------------------------------------------------------------
// enforceRetentionPolicies
// ---------------------------------------------------------------------------
describe('enforceRetentionPolicies', () => {
  it('deletes old records for each entity and creates audit log', async () => {
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 5 })
    prisma.notification.deleteMany.mockResolvedValue({ count: 3 })
    prisma.chatMessage.deleteMany.mockResolvedValue({ count: 2 })
    prisma.session.deleteMany.mockResolvedValue({ count: 10 })

    const { enforceRetentionPolicies } = await import('@/services/compliance.service')
    const results = await enforceRetentionPolicies('admin-1')

    expect(results).toEqual([
      { entity: 'AuditLog', deleted: 5 },
      { entity: 'Notification', deleted: 3 },
      { entity: 'ChatMessage', deleted: 2 },
      { entity: 'Session', deleted: 10 },
    ])

    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    })
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) }, readAt: { not: null } },
    })
    expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) }, isDeleted: true },
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { expires: { lt: expect.any(Date) } },
    })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'DELETE',
      entity: 'RetentionPolicy',
      details: { results },
    })
  })

  it('handles zero deletions', async () => {
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 0 })
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 })
    prisma.chatMessage.deleteMany.mockResolvedValue({ count: 0 })
    prisma.session.deleteMany.mockResolvedValue({ count: 0 })

    const { enforceRetentionPolicies } = await import('@/services/compliance.service')
    const results = await enforceRetentionPolicies('admin-1')

    expect(results).toEqual([
      { entity: 'AuditLog', deleted: 0 },
      { entity: 'Notification', deleted: 0 },
      { entity: 'ChatMessage', deleted: 0 },
      { entity: 'Session', deleted: 0 },
    ])
  })
})

// ---------------------------------------------------------------------------
// reportBreach
// ---------------------------------------------------------------------------
describe('reportBreach', () => {
  it('creates breach report and audit log', async () => {
    const data = {
      severity: 'HIGH' as const,
      description: 'Data leak detected',
      affectedUsers: 100,
    }

    const { reportBreach } = await import('@/services/compliance.service')
    const result = await reportBreach('admin-1', data)

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.stringContaining('breach-'),
        reportedAt: expect.any(String),
        severity: 'HIGH',
        description: 'Data leak detected',
        affectedUsers: 100,
        status: 'REPORTED',
        reportedBy: 'admin-1',
      })
    )

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'admin-1',
      action: 'CREATE',
      entity: 'BreachReport',
      entityId: result.id,
      details: { severity: 'HIGH', affectedUsers: 100 },
    })
  })
})

// ---------------------------------------------------------------------------
// listBreachReports
// ---------------------------------------------------------------------------
describe('listBreachReports', () => {
  it('returns breach reports sorted by date desc', async () => {
    const { reportBreach, listBreachReports } = await import('@/services/compliance.service')

    await reportBreach('admin-1', { severity: 'LOW', description: 'First', affectedUsers: 1 })
    await reportBreach('admin-1', { severity: 'HIGH', description: 'Second', affectedUsers: 2 })

    const reports = listBreachReports()
    expect(reports.length).toBeGreaterThanOrEqual(2)
    // Most recent first
    const lastTwo = reports.slice(0, 2)
    expect(new Date(lastTwo[0].reportedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(lastTwo[1].reportedAt).getTime()
    )
  })
})

// ---------------------------------------------------------------------------
// getComplianceStatus
// ---------------------------------------------------------------------------
describe('getComplianceStatus', () => {
  it('returns compliance status with stats', async () => {
    prisma.consent.count.mockResolvedValue(10)
    prisma.auditLog.count.mockResolvedValue(50)
    prisma.user.count.mockResolvedValue(5)

    const { getComplianceStatus } = await import('@/services/compliance.service')
    const result = await getComplianceStatus()

    expect(result.gdpr).toEqual({
      consentTracking: true,
      auditLogging: true,
      dataExport: true,
      dataErasure: true,
      rightToAccess: true,
    })
    expect(result.hipaa).toEqual({
      encryptionAtRest: true,
      auditTrail: true,
      accessControls: true,
      dataBackup: true,
    })
    expect(result.lgpd).toEqual({
      consentManagement: true,
      dataPortability: true,
      anonymization: true,
    })
    expect(result.stats).toEqual({
      totalConsents: 10,
      totalAuditLogs: 50,
      totalUsers: 5,
    })
    expect(result.retentionPolicies).toHaveLength(4)
  })

  it('handles zero counts', async () => {
    prisma.consent.count.mockResolvedValue(0)
    prisma.auditLog.count.mockResolvedValue(0)
    prisma.user.count.mockResolvedValue(0)

    const { getComplianceStatus } = await import('@/services/compliance.service')
    const result = await getComplianceStatus()

    expect(result.stats).toEqual({
      totalConsents: 0,
      totalAuditLogs: 0,
      totalUsers: 0,
    })
    // consentTracking is always true due to `|| true`
    expect(result.gdpr.consentTracking).toBe(true)
  })
})
