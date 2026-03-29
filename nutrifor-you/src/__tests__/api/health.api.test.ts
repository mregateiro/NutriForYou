import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns status 200', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
  })

  it('returns status: "ok"', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.status).toBe('ok')
  })

  it('returns a valid ISO timestamp', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.timestamp).toBeDefined()
    const parsed = Date.parse(data.timestamp)
    expect(Number.isNaN(parsed)).toBe(false)
  })

  it('returns environment field', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.environment).toBeDefined()
    expect(typeof data.environment).toBe('string')
  })

  it('returns version field', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.version).toBeDefined()
    expect(typeof data.version).toBe('string')
  })
})
