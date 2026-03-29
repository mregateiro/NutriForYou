/**
 * Creates a mock NextAuth session for testing API routes
 */
export function createMockSession(overrides: Partial<{
  id: string
  email: string
  name: string
  role: string
  subscriptionTier: string
  organizationId: string | null
}> = {}) {
  return {
    user: {
      id: overrides.id ?? 'test-user-id',
      email: overrides.email ?? 'test@example.com',
      name: overrides.name ?? 'Test User',
      role: overrides.role ?? 'NUTRITIONIST',
      subscriptionTier: overrides.subscriptionTier ?? 'PREMIUM',
      organizationId: overrides.organizationId ?? null,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }
}

/**
 * Creates a mock admin session
 */
export function createMockAdminSession(overrides: Partial<{
  id: string
  email: string
  name: string
}> = {}) {
  return createMockSession({
    ...overrides,
    role: 'ADMIN',
    subscriptionTier: 'BUSINESS',
  })
}

/**
 * Creates a mock patient session
 */
export function createMockPatientSession(overrides: Partial<{
  id: string
  email: string
  name: string
}> = {}) {
  return createMockSession({
    ...overrides,
    role: 'PATIENT',
    subscriptionTier: 'TRIAL',
  })
}
