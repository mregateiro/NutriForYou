import { vi } from 'vitest'

/**
 * Returns the mocked Prisma client from the global mock.
 * Use this to set up return values for Prisma calls in tests.
 */
export function getMockedPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { prisma } = require('@/lib/prisma')
  return prisma as Record<string, Record<string, ReturnType<typeof vi.fn>>>
}

/**
 * Resets all Prisma mock implementations between tests
 */
export function resetPrismaMocks() {
  const prisma = getMockedPrisma()
  for (const model of Object.values(prisma)) {
    if (typeof model === 'object' && model !== null) {
      for (const method of Object.values(model)) {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as ReturnType<typeof vi.fn>).mockReset()
        }
      }
    }
  }
}
