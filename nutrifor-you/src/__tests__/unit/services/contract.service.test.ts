import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildContract, buildPatient } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

describe('createContract', () => {
  it('creates contract and audit log', async () => {
    const patient = buildPatient()
    const input = {
      patientId: patient.id,
      title: 'Service Agreement',
      content: 'Terms and conditions apply.',
      expiresAt: '2026-12-31',
    }
    const contract = buildContract({
      createdById: 'nutritionist-1',
      patientId: patient.id,
      title: input.title,
      content: input.content,
      patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName },
    })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.contract.create.mockResolvedValue(contract)

    const { createContract } = await import('@/services/contract.service')
    const result = await createContract('nutritionist-1', input)

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: input.patientId, nutritionistId: 'nutritionist-1', isActive: true },
    })
    expect(prisma.contract.create).toHaveBeenCalledWith({
      data: {
        createdById: 'nutritionist-1',
        patientId: input.patientId,
        title: input.title,
        content: input.content,
        expiresAt: expect.any(Date),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    expect(result).toEqual(contract)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'nutritionist-1',
      action: 'CREATE',
      entity: 'Contract',
      entityId: contract.id,
      details: { patientId: input.patientId },
    })
  })

  it('creates contract without expiresAt', async () => {
    const patient = buildPatient()
    const input = { patientId: patient.id, title: 'Agreement', content: 'Content' }
    const contract = buildContract({ createdById: 'nutritionist-1', patientId: patient.id })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.contract.create.mockResolvedValue(contract)

    const { createContract } = await import('@/services/contract.service')
    await createContract('nutritionist-1', input)

    expect(prisma.contract.create).toHaveBeenCalledWith({
      data: {
        createdById: 'nutritionist-1',
        patientId: input.patientId,
        title: input.title,
        content: input.content,
        expiresAt: undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    })
  })

  it('throws when patient not found', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { createContract } = await import('@/services/contract.service')
    await expect(
      createContract('nutritionist-1', { patientId: 'bad-id', title: 'T', content: 'C' })
    ).rejects.toThrow('Patient not found')

    expect(prisma.contract.create).not.toHaveBeenCalled()
  })
})

describe('getContractById', () => {
  it('returns contract when found', async () => {
    const contract = buildContract({ createdById: 'user-1' })
    prisma.contract.findFirst.mockResolvedValue(contract)

    const { getContractById } = await import('@/services/contract.service')
    const result = await getContractById(contract.id, 'user-1')

    expect(prisma.contract.findFirst).toHaveBeenCalledWith({
      where: {
        id: contract.id,
        OR: [{ createdById: 'user-1' }, { patient: { nutritionistId: 'user-1' } }],
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })
    expect(result).toEqual(contract)
  })

  it('returns null when contract not found', async () => {
    prisma.contract.findFirst.mockResolvedValue(null)

    const { getContractById } = await import('@/services/contract.service')
    const result = await getContractById('non-existent', 'user-1')

    expect(result).toBeNull()
  })
})

describe('updateContract', () => {
  it('updates contract and creates audit log', async () => {
    const existing = buildContract({ status: 'DRAFT', createdById: 'user-1' })
    const input = { title: 'Updated Title', content: 'Updated content' }
    const updated = buildContract({
      ...existing,
      ...input,
      patient: { id: 'test-patient-id', firstName: 'John', lastName: 'Doe' },
    })

    prisma.contract.findFirst.mockResolvedValue(existing)
    prisma.contract.update.mockResolvedValue(updated)

    const { updateContract } = await import('@/services/contract.service')
    const result = await updateContract(existing.id, 'user-1', input)

    expect(prisma.contract.findFirst).toHaveBeenCalledWith({
      where: { id: existing.id, createdById: 'user-1' },
    })
    expect(prisma.contract.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: {
        title: input.title,
        content: input.content,
        status: undefined,
        expiresAt: undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    expect(result).toEqual(updated)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'Contract',
      entityId: existing.id,
      details: { updatedFields: ['title', 'content'] },
    })
  })

  it('throws when contract not found', async () => {
    prisma.contract.findFirst.mockResolvedValue(null)

    const { updateContract } = await import('@/services/contract.service')
    await expect(
      updateContract('non-existent', 'user-1', { title: 'New' })
    ).rejects.toThrow('Contract not found')

    expect(prisma.contract.update).not.toHaveBeenCalled()
  })

  it('throws when editing a signed contract', async () => {
    const existing = buildContract({ status: 'SIGNED', createdById: 'user-1' })
    prisma.contract.findFirst.mockResolvedValue(existing)

    const { updateContract } = await import('@/services/contract.service')
    await expect(
      updateContract(existing.id, 'user-1', { title: 'Changed' })
    ).rejects.toThrow('Cannot edit a signed contract')

    expect(prisma.contract.update).not.toHaveBeenCalled()
  })
})

describe('listContracts', () => {
  it('returns contracts with default pagination', async () => {
    const contracts = [buildContract(), buildContract()]
    prisma.contract.findMany.mockResolvedValue(contracts)
    prisma.contract.count.mockResolvedValue(2)

    const { listContracts } = await import('@/services/contract.service')
    const result = await listContracts('user-1', {})

    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdById: 'user-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    )
    expect(prisma.contract.count).toHaveBeenCalledWith({ where: { createdById: 'user-1' } })
    expect(result.data).toEqual(contracts)
    expect(result.pagination).toEqual({ page: 1, perPage: 20, total: 2, totalPages: 1 })
  })

  it('applies pagination parameters', async () => {
    prisma.contract.findMany.mockResolvedValue([])
    prisma.contract.count.mockResolvedValue(50)

    const { listContracts } = await import('@/services/contract.service')
    const result = await listContracts('user-1', { page: 3, perPage: 10 })

    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    )
    expect(result.pagination).toEqual({ page: 3, perPage: 10, total: 50, totalPages: 5 })
  })

  it('filters by patientId and status', async () => {
    prisma.contract.findMany.mockResolvedValue([])
    prisma.contract.count.mockResolvedValue(0)

    const { listContracts } = await import('@/services/contract.service')
    await listContracts('user-1', { patientId: 'patient-1', status: 'SIGNED' })

    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdById: 'user-1', patientId: 'patient-1', status: 'SIGNED' },
      })
    )
    expect(prisma.contract.count).toHaveBeenCalledWith({
      where: { createdById: 'user-1', patientId: 'patient-1', status: 'SIGNED' },
    })
  })
})

describe('signContract', () => {
  it('signs contract with signature data', async () => {
    const contract = buildContract({
      status: 'SENT',
      expiresAt: new Date(Date.now() + 365 * 86400000),
    })
    const signed = {
      ...contract,
      status: 'SIGNED',
      signatureData: 'base64-signature',
      signedAt: new Date(),
    }

    prisma.contract.findFirst.mockResolvedValue(contract)
    prisma.contract.update.mockResolvedValue(signed)

    const { signContract } = await import('@/services/contract.service')
    const result = await signContract(contract.id, 'patient-user-1', 'base64-signature')

    expect(prisma.contract.findFirst).toHaveBeenCalledWith({
      where: {
        id: contract.id,
        status: 'SENT',
        patient: { userId: 'patient-user-1' },
      },
    })
    expect(prisma.contract.update).toHaveBeenCalledWith({
      where: { id: contract.id },
      data: {
        status: 'SIGNED',
        signatureData: 'base64-signature',
        signedAt: expect.any(Date),
      },
    })
    expect(result).toEqual(signed)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'patient-user-1',
      action: 'UPDATE',
      entity: 'Contract',
      entityId: contract.id,
      details: { action: 'signed' },
    })
  })

  it('auto-expires and throws when contract has expired', async () => {
    const contract = buildContract({
      status: 'SENT',
      expiresAt: new Date(Date.now() - 86400000), // expired yesterday
    })

    prisma.contract.findFirst.mockResolvedValue(contract)
    prisma.contract.update.mockResolvedValue({ ...contract, status: 'EXPIRED' })

    const { signContract } = await import('@/services/contract.service')
    await expect(
      signContract(contract.id, 'patient-user-1', 'sig')
    ).rejects.toThrow('Contract has expired')

    expect(prisma.contract.update).toHaveBeenCalledWith({
      where: { id: contract.id },
      data: { status: 'EXPIRED' },
    })
  })

  it('throws when contract not found or not available for signing', async () => {
    prisma.contract.findFirst.mockResolvedValue(null)

    const { signContract } = await import('@/services/contract.service')
    await expect(
      signContract('non-existent', 'patient-user-1', 'sig')
    ).rejects.toThrow('Contract not found or not available for signing')

    expect(prisma.contract.update).not.toHaveBeenCalled()
  })
})

describe('revokeContract', () => {
  it('revokes contract and creates audit log', async () => {
    const existing = buildContract({ status: 'SENT', createdById: 'user-1' })
    const revoked = { ...existing, status: 'REVOKED' }

    prisma.contract.findFirst.mockResolvedValue(existing)
    prisma.contract.update.mockResolvedValue(revoked)

    const { revokeContract } = await import('@/services/contract.service')
    const result = await revokeContract(existing.id, 'user-1')

    expect(prisma.contract.findFirst).toHaveBeenCalledWith({
      where: { id: existing.id, createdById: 'user-1' },
    })
    expect(prisma.contract.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: { status: 'REVOKED' },
    })
    expect(result).toEqual(revoked)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'UPDATE',
      entity: 'Contract',
      entityId: existing.id,
      details: { action: 'revoked' },
    })
  })

  it('throws when contract not found', async () => {
    prisma.contract.findFirst.mockResolvedValue(null)

    const { revokeContract } = await import('@/services/contract.service')
    await expect(revokeContract('non-existent', 'user-1')).rejects.toThrow('Contract not found')

    expect(prisma.contract.update).not.toHaveBeenCalled()
  })

  it('throws when contract is already revoked', async () => {
    const existing = buildContract({ status: 'REVOKED', createdById: 'user-1' })
    prisma.contract.findFirst.mockResolvedValue(existing)

    const { revokeContract } = await import('@/services/contract.service')
    await expect(revokeContract(existing.id, 'user-1')).rejects.toThrow(
      'Contract is already revoked'
    )

    expect(prisma.contract.update).not.toHaveBeenCalled()
  })
})

describe('deleteContract', () => {
  it('deletes draft contract and creates audit log', async () => {
    const existing = buildContract({ status: 'DRAFT', createdById: 'user-1' })

    prisma.contract.findFirst.mockResolvedValue(existing)
    prisma.contract.delete.mockResolvedValue(existing)

    const { deleteContract } = await import('@/services/contract.service')
    await deleteContract(existing.id, 'user-1')

    expect(prisma.contract.findFirst).toHaveBeenCalledWith({
      where: { id: existing.id, createdById: 'user-1', status: 'DRAFT' },
    })
    expect(prisma.contract.delete).toHaveBeenCalledWith({ where: { id: existing.id } })

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'DELETE',
      entity: 'Contract',
      entityId: existing.id,
    })
  })

  it('throws when contract is not a draft', async () => {
    prisma.contract.findFirst.mockResolvedValue(null)

    const { deleteContract } = await import('@/services/contract.service')
    await expect(deleteContract('contract-1', 'user-1')).rejects.toThrow(
      'Only draft contracts can be deleted'
    )

    expect(prisma.contract.delete).not.toHaveBeenCalled()
  })
})
