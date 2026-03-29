import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../helpers/mock-prisma'

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
}))

vi.mock('@prisma/client', () => ({
  AuditAction: { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE' },
}))

const prisma = getMockedPrisma()

function buildRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'Password1',
  confirmPassword: 'Password1',
}

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

describe('POST /api/auth/register', () => {
  it('returns 201 on successful registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 'new-user-id', email: 'john@example.com', role: 'NUTRITIONIST' })

    const { POST } = await import('@/app/api/auth/register/route')
    const response = await POST(buildRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('Account created successfully')
    expect(data.userId).toBe('new-user-id')
  })

  it('creates user with NUTRITIONIST role and TRIAL tier', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'john@example.com', role: 'NUTRITIONIST' })

    const { POST } = await import('@/app/api/auth/register/route')
    await POST(buildRequest(validBody) as never)

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: 'NUTRITIONIST',
        subscriptionTier: 'TRIAL',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
      }),
    })
  })

  it('returns 409 for duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' })

    const { POST } = await import('@/app/api/auth/register/route')
    const response = await POST(buildRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('already exists')
  })

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const response = await POST(buildRequest({ email: 'x@x.com' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 for weak password (no uppercase)', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const response = await POST(
      buildRequest({ ...validBody, password: 'password1', confirmPassword: 'password1' }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 400 when passwords do not match', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const response = await POST(
      buildRequest({ ...validBody, confirmPassword: 'Different1' }) as never,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('returns 500 when database throws', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockRejectedValue(new Error('DB connection error'))

    const { POST } = await import('@/app/api/auth/register/route')
    const response = await POST(buildRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('lowercases email before storing', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'john@example.com', role: 'NUTRITIONIST' })

    const { POST } = await import('@/app/api/auth/register/route')
    await POST(buildRequest({ ...validBody, email: 'JOHN@EXAMPLE.COM' }) as never)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    })
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'john@example.com' }),
    })
  })
})
