import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildPatient, buildMealPlan } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
  vi.stubEnv('AI_API_KEY', 'test-api-key')
  vi.stubEnv('AI_BASE_URL', 'https://test-ai.example.com/v1')
  vi.stubEnv('AI_MODEL', 'test-model')
  vi.stubEnv('AI_FALLBACK_MODELS', '')
})

// ---------------------------------------------------------------------------
// generateMealPlan
// ---------------------------------------------------------------------------
describe('generateMealPlan', () => {
  const defaultInput = {
    patientId: 'patient-1',
    title: 'Test Meal Plan',
    numberOfDays: 1,
    mealsPerDay: 1,
  }

  it('creates meal plan with AI-generated content when AI call succeeds', async () => {
    const patient = buildPatient({ id: 'patient-1', nutritionistId: 'nutri-1' })
    const mealPlan = buildMealPlan({ id: 'mp-1', aiGenerated: true })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(mealPlan)

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify([{
              dayOfWeek: 'MONDAY',
              meals: [{
                mealType: 'BREAKFAST',
                name: 'Oatmeal',
                time: '08:00',
                foodItems: [{
                  name: 'Oats',
                  quantity: 100,
                  unit: 'g',
                  calories: 389,
                  protein: 17,
                  carbs: 66,
                  fat: 7,
                }],
              }],
            }]),
          },
        }],
      }),
    })

    const { generateMealPlan } = await import('@/services/ai-meal-plan.service')
    const result = await generateMealPlan('nutri-1', defaultInput as never)

    expect(result).toEqual(mealPlan)
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'patient-1', nutritionistId: 'nutri-1', isActive: true },
    })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-ai.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      }),
    )
    expect(prisma.mealPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: 'patient-1',
          nutritionistId: 'nutri-1',
          title: 'Test Meal Plan',
          aiGenerated: true,
          notes: null,
        }),
      }),
    )

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'nutri-1',
      action: 'CREATE',
      entity: 'MealPlan',
      entityId: mealPlan.id,
      details: { aiGenerated: true, patientId: 'patient-1' },
    })
  })

  it('creates meal plan with fallback content when AI call fails', async () => {
    const patient = buildPatient({ id: 'patient-1', nutritionistId: 'nutri-1' })
    const mealPlan = buildMealPlan({ id: 'mp-2', aiGenerated: true, notes: 'AI_FALLBACK' })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(mealPlan)

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    })

    const { generateMealPlan } = await import('@/services/ai-meal-plan.service')
    const result = await generateMealPlan('nutri-1', defaultInput as never)

    expect(result).toEqual(mealPlan)
    expect(prisma.mealPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiGenerated: true,
          notes: 'AI_FALLBACK',
          description: expect.stringContaining('AI generation failed'),
        }),
      }),
    )
  })

  it('throws when patient not found', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { generateMealPlan } = await import('@/services/ai-meal-plan.service')

    await expect(
      generateMealPlan('nutri-1', defaultInput as never),
    ).rejects.toThrow('Patient not found')
  })

  it('adds OpenRouter-specific headers and provider config when using OpenRouter', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://openrouter.ai/api/v1')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://myapp.example.com')

    const patient = buildPatient({ id: 'patient-1', nutritionistId: 'nutri-1' })
    const mealPlan = buildMealPlan({ id: 'mp-3', aiGenerated: true })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(mealPlan)

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify([{
              dayOfWeek: 'MONDAY',
              meals: [{
                mealType: 'BREAKFAST',
                name: 'Oatmeal',
                time: '08:00',
                foodItems: [{
                  name: 'Oats', quantity: 100, unit: 'g',
                  calories: 389, protein: 17, carbs: 66, fat: 7,
                }],
              }],
            }]),
          },
        }],
      }),
    })

    const { generateMealPlan } = await import('@/services/ai-meal-plan.service')
    await generateMealPlan('nutri-1', defaultInput as never)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'HTTP-Referer': 'https://myapp.example.com',
          'X-Title': 'NutriForYou',
        }),
      }),
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.provider).toEqual({
      allow_fallbacks: true,
      data_collection: 'allow',
    })
  })

  it('retries with fallback models on 404 errors', async () => {
    vi.stubEnv('AI_FALLBACK_MODELS', 'fallback-model-1,fallback-model-2')

    const patient = buildPatient({ id: 'patient-1', nutritionistId: 'nutri-1' })
    const mealPlan = buildMealPlan({ id: 'mp-4', aiGenerated: true })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(mealPlan)

    // First call (primary model) returns 404
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => '{"error":{"message":"No endpoints available","code":404}}',
    })
    // Second call (fallback model) succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify([{
              dayOfWeek: 'MONDAY',
              meals: [{
                mealType: 'BREAKFAST',
                name: 'Oatmeal',
                time: '08:00',
                foodItems: [{
                  name: 'Oats', quantity: 100, unit: 'g',
                  calories: 389, protein: 17, carbs: 66, fat: 7,
                }],
              }],
            }]),
          },
        }],
      }),
    })

    const { generateMealPlan } = await import('@/services/ai-meal-plan.service')
    const result = await generateMealPlan('nutri-1', defaultInput as never)

    expect(result).toEqual(mealPlan)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Verify the second call used the fallback model
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(secondCallBody.model).toBe('fallback-model-1')
  })

  it('does not add OpenRouter headers for non-OpenRouter base URLs', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://api.openai.com/v1')

    const patient = buildPatient({ id: 'patient-1', nutritionistId: 'nutri-1' })
    const mealPlan = buildMealPlan({ id: 'mp-5', aiGenerated: true })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(mealPlan)

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify([{
              dayOfWeek: 'MONDAY',
              meals: [{
                mealType: 'BREAKFAST',
                name: 'Oatmeal',
                time: '08:00',
                foodItems: [{
                  name: 'Oats', quantity: 100, unit: 'g',
                  calories: 389, protein: 17, carbs: 66, fat: 7,
                }],
              }],
            }]),
          },
        }],
      }),
    })

    const { generateMealPlan } = await import('@/services/ai-meal-plan.service')
    await generateMealPlan('nutri-1', defaultInput as never)

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['HTTP-Referer']).toBeUndefined()
    expect(headers['X-Title']).toBeUndefined()

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.provider).toBeUndefined()
  })
})
