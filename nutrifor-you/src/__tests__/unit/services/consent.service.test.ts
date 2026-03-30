import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildConsent, buildUser, buildAuditLog } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// grantConsent
// ---------------------------------------------------------------------------
describe('grantConsent', () => {
  it('revokes existing consent, creates new consent and audit log', async () => {
    const input = { purpose: 'DATA_PROCESSING' as const, granted: true, version: '1.0' }
    const consent = buildConsent({ userId: 'user-1', ...input })

    prisma.consent.updateMany.mockResolvedValue({ count: 1 })
    prisma.consent.create.mockResolvedValue(consent)

    const { grantConsent } = await import('@/services/consent.service')
    const result = await grantConsent('user-1', input, '192.168.1.1')

    expect(prisma.consent.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', purpose: 'DATA_PROCESSING', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(prisma.consent.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        purpose: 'DATA_PROCESSING',
        granted: true,
        version: '1.0',
        ipAddress: '192.168.1.1',
        grantedAt: expect.any(Date),
      },
    })
    expect(result).toEqual(consent)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'CREATE',
      entity: 'Consent',
      entityId: consent.id,
      details: { purpose: 'DATA_PROCESSING', granted: true },
    })
  })

  it('grants consent without ipAddress', async () => {
    const input = { purpose: 'MARKETING' as const, granted: false, version: '2.0' }
    const consent = buildConsent({ userId: 'user-2', ...input })

    prisma.consent.updateMany.mockResolvedValue({ count: 0 })
    prisma.consent.create.mockResolvedValue(consent)

    const { grantConsent } = await import('@/services/consent.service')
    const result = await grantConsent('user-2', input)

    expect(prisma.consent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-2',
        ipAddress: undefined,
      }),
    })
    expect(result).toEqual(consent)
  })
})

// ---------------------------------------------------------------------------
// getConsents
// ---------------------------------------------------------------------------
describe('getConsents', () => {
  it('returns active consents for user', async () => {
    const consents = [buildConsent(), buildConsent()]
    prisma.consent.findMany.mockResolvedValue(consents)

    const { getConsents } = await import('@/services/consent.service')
    const result = await getConsents('user-1')

    expect(prisma.consent.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      orderBy: { grantedAt: 'desc' },
    })
    expect(result).toEqual(consents)
  })
})

// ---------------------------------------------------------------------------
// getConsentHistory
// ---------------------------------------------------------------------------
describe('getConsentHistory', () => {
  it('returns all consents including revoked', async () => {
    const consents = [
      buildConsent(),
      buildConsent({ revokedAt: new Date() }),
    ]
    prisma.consent.findMany.mockResolvedValue(consents)

    const { getConsentHistory } = await import('@/services/consent.service')
    const result = await getConsentHistory('user-1')

    expect(prisma.consent.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { grantedAt: 'desc' },
    })
    expect(result).toEqual(consents)
  })
})

// ---------------------------------------------------------------------------
// revokeConsent
// ---------------------------------------------------------------------------
describe('revokeConsent', () => {
  it('revokes consent and creates audit log', async () => {
    prisma.consent.updateMany.mockResolvedValue({ count: 1 })

    const { revokeConsent } = await import('@/services/consent.service')
    const result = await revokeConsent('user-1', 'DATA_PROCESSING' as never)

    expect(prisma.consent.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', purpose: 'DATA_PROCESSING', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(result).toEqual({ count: 1 })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'Consent',
      details: { purpose: 'DATA_PROCESSING', action: 'revoke' },
    })
  })
})

// ---------------------------------------------------------------------------
// exportUserData
// ---------------------------------------------------------------------------
describe('exportUserData', () => {
  it('exports data for non-nutritionist user', async () => {
    const user = buildUser({ id: 'user-1', role: 'PATIENT' })
    const consents = [buildConsent()]
    const auditLogs = [buildAuditLog()]

    prisma.user.findUnique.mockResolvedValue(user)
    prisma.consent.findMany.mockResolvedValue(consents)
    prisma.auditLog.findMany.mockResolvedValue(auditLogs)

    const { exportUserData } = await import('@/services/consent.service')
    const result = await exportUserData('user-1')

    expect(result).toEqual(
      expect.objectContaining({
        exportedAt: expect.any(String),
        user,
        consents,
        auditLogs,
        patients: null,
        consultations: null,
        mealPlans: null,
      })
    )

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'EXPORT',
      entity: 'UserData',
      details: { type: 'full_export' },
    })
  })

  it('exports additional data for nutritionist user', async () => {
    const user = buildUser({ id: 'nutri-1', role: 'NUTRITIONIST' })
    const consents = [buildConsent()]
    const auditLogs = [buildAuditLog()]
    const patients = [{ id: 'p1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', createdAt: new Date() }]
    const consultations = [{ id: 'c1', title: 'Consult', status: 'COMPLETED', createdAt: new Date(), patientId: 'p1' }]
    const mealPlans = [{ id: 'm1', title: 'Plan', status: 'ACTIVE', createdAt: new Date(), patientId: 'p1' }]

    prisma.user.findUnique.mockResolvedValue(user)
    prisma.consent.findMany.mockResolvedValue(consents)
    prisma.auditLog.findMany.mockResolvedValue(auditLogs)
    prisma.patient.findMany.mockResolvedValue(patients)
    prisma.consultation.findMany.mockResolvedValue(consultations)
    prisma.mealPlan.findMany.mockResolvedValue(mealPlans)

    const { exportUserData } = await import('@/services/consent.service')
    const result = await exportUserData('nutri-1')

    expect(result.patients).toEqual(patients)
    expect(result.consultations).toEqual(consultations)
    expect(result.mealPlans).toEqual(mealPlans)
  })
})

// ---------------------------------------------------------------------------
// requestDataErasure
// ---------------------------------------------------------------------------
describe('requestDataErasure', () => {
  it('erases user data when email matches', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'user@test.com' })

    const { requestDataErasure } = await import('@/services/consent.service')
    const result = await requestDataErasure('user-1', 'user@test.com', 'Privacy concerns')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true },
    })
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(result).toEqual({ success: true, message: 'Account data has been erased' })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'DELETE',
      entity: 'UserData',
      details: { type: 'erasure_request', reason: 'Privacy concerns' },
    })
  })

  it('throws when email does not match', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'real@test.com' })

    const { requestDataErasure } = await import('@/services/consent.service')
    await expect(requestDataErasure('user-1', 'wrong@test.com')).rejects.toThrow(
      'Email confirmation does not match'
    )
  })

  it('throws when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const { requestDataErasure } = await import('@/services/consent.service')
    await expect(requestDataErasure('bad-id', 'any@test.com')).rejects.toThrow(
      'Email confirmation does not match'
    )
  })
})
