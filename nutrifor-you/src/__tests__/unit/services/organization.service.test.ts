import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildUser, buildOrganization } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getOrganization
// ---------------------------------------------------------------------------
describe('getOrganization', () => {
  it('returns organization when user has organizationId', async () => {
    const org = buildOrganization()
    prisma.user.findUnique.mockResolvedValue({ organizationId: org.id })
    prisma.organization.findUnique.mockResolvedValue(org)

    const { getOrganization } = await import('@/services/organization.service')
    const result = await getOrganization('user-1')

    expect(result).toEqual(org)
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { organizationId: true },
    })
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: org.id },
    })
  })

  it('returns null when user has no organizationId', async () => {
    prisma.user.findUnique.mockResolvedValue({ organizationId: null })

    const { getOrganization } = await import('@/services/organization.service')
    const result = await getOrganization('user-1')

    expect(result).toBeNull()
    expect(prisma.organization.findUnique).not.toHaveBeenCalled()
  })

  it('returns null when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const { getOrganization } = await import('@/services/organization.service')
    const result = await getOrganization('nonexistent')

    expect(result).toBeNull()
    expect(prisma.organization.findUnique).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// updateOrganization
// ---------------------------------------------------------------------------
describe('updateOrganization', () => {
  it('updates organization with audit log', async () => {
    const org = buildOrganization({ id: 'org-1' })
    prisma.user.findUnique.mockResolvedValue({ organizationId: 'org-1', role: 'ADMIN' })
    prisma.organization.update.mockResolvedValue(org)

    const { updateOrganization } = await import('@/services/organization.service')
    const input = { name: 'New Name', website: 'https://example.com' }
    const result = await updateOrganization('user-1', input as never)

    expect(result).toEqual(org)
    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-1' },
        data: expect.objectContaining({ name: 'New Name', website: 'https://example.com' }),
      }),
    )

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'Organization',
      entityId: org.id,
      details: { updatedFields: ['name', 'website'] },
    })
  })

  it('throws when user has no organization', async () => {
    prisma.user.findUnique.mockResolvedValue({ organizationId: null, role: 'NUTRITIONIST' })

    const { updateOrganization } = await import('@/services/organization.service')

    await expect(
      updateOrganization('user-1', { name: 'New Name' } as never),
    ).rejects.toThrow('No organization found')
  })
})

// ---------------------------------------------------------------------------
// getOrganizationBranding
// ---------------------------------------------------------------------------
describe('getOrganizationBranding', () => {
  it('returns branding by slug', async () => {
    const branding = {
      name: 'Org Name',
      logoUrl: 'https://logo.png',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
    }
    prisma.organization.findUnique.mockResolvedValue(branding)

    const { getOrganizationBranding } = await import('@/services/organization.service')
    const result = await getOrganizationBranding('my-org')

    expect(result).toEqual(branding)
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { slug: 'my-org' },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
      },
    })
  })

  it('returns null when not found', async () => {
    prisma.organization.findUnique.mockResolvedValue(null)

    const { getOrganizationBranding } = await import('@/services/organization.service')
    const result = await getOrganizationBranding('nonexistent')

    expect(result).toBeNull()
  })
})
