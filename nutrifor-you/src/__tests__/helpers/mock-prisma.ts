import { vi } from 'vitest'
import { prisma as prismaMock } from '@/lib/prisma'

/**
 * Returns the mocked Prisma client from the global mock.
 * Use this to set up return values for Prisma calls in tests.
 */
export function getMockedPrisma() {
  return prismaMock as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>
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
