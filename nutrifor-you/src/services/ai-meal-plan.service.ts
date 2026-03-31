import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createAuditLog } from './audit.service'
import { AuditAction, MealPlanStatus } from '@prisma/client'
import type { GenerateMealPlanInput } from '@/validators/meal-plan.schema'

interface AIMealPlanDay {
  dayOfWeek: string
  meals: {
    mealType: string
    name: string
    time: string
    foodItems: {
      name: string
      quantity: number
      unit: string
      calories: number
      protein: number
      carbs: number
      fat: number
    }[]
  }[]
}

const MEAL_TYPES = ['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK'] as const
const MEAL_TIMES = ['07:00', '10:00', '12:30', '15:30', '19:00', '21:00'] as const
const DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const

/**
 * Generate a meal plan using AI.
 * Supports OpenRouter (default), OpenAI, or any OpenAI-compatible provider.
 * Configure via AI_BASE_URL, AI_API_KEY, and AI_MODEL env vars.
 * Falls back to a structured template if AI is unavailable.
 */
export async function generateMealPlan(
  nutritionistId: string,
  input: GenerateMealPlanInput
) {
  // Get patient data for context
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, nutritionistId, isActive: true },
  })
  if (!patient) throw new Error('Patient not found')

  const prompt = buildPrompt(patient, input)

  let days: AIMealPlanDay[]
  let usedFallback = false

  try {
    days = await callAI(prompt)
  } catch (error) {
    logger.warn({ error }, 'AI call failed, using fallback template')
    days = generateFallbackPlan(input)
    usedFallback = true
  }

  // Create meal plan in database

  const mealPlan = await prisma.mealPlan.create({
    data: {
      patientId: input.patientId,
      nutritionistId,
      title: input.title,
      description: usedFallback
        ? `⚠️ AI generation failed — this plan contains sample meals as a starting template. Please review and customize each item for ${patient.firstName} ${patient.lastName}.`
        : `AI-generated meal plan for ${patient.firstName} ${patient.lastName}`,
      status: MealPlanStatus.DRAFT,
      aiGenerated: true,
      aiPrompt: prompt,
      notes: usedFallback ? 'AI_FALLBACK' : null,
      days: {
        create: days.map((day, index) => ({
          dayOfWeek: (day.dayOfWeek || DAY_NAMES[index % 7]) as 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY',
          meals: {
            create: day.meals.map(meal => ({
              mealType: meal.mealType as 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'AFTERNOON_SNACK' | 'DINNER' | 'EVENING_SNACK',
              name: meal.name,
              time: meal.time,
              totalCalories: meal.foodItems.reduce((s, fi) => s + fi.calories, 0),
              totalProtein: meal.foodItems.reduce((s, fi) => s + fi.protein, 0),
              totalCarbs: meal.foodItems.reduce((s, fi) => s + fi.carbs, 0),
              totalFat: meal.foodItems.reduce((s, fi) => s + fi.fat, 0),
              foodItems: {
                create: meal.foodItems.map(fi => ({
                  name: fi.name,
                  quantity: fi.quantity,
                  unit: fi.unit,
                  calories: fi.calories,
                  protein: fi.protein,
                  carbs: fi.carbs,
                  fat: fi.fat,
                })),
              },
            })),
          },
        })),
      },
    },
    include: {
      days: {
        include: {
          meals: {
            include: { foodItems: true },
          },
        },
      },
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.CREATE,
    entity: 'MealPlan',
    entityId: mealPlan.id,
    details: { aiGenerated: true, patientId: input.patientId },
  })

  logger.info({ mealPlanId: mealPlan.id, nutritionistId, aiGenerated: true }, 'AI meal plan generated')
  return mealPlan
}

function buildPrompt(
  patient: { firstName: string; lastName: string; weight: number | null; height: number | null; targetWeight: number | null; allergies: string[]; dietaryRestrictions: string[]; goals: string | null; activityLevel: string | null },
  input: GenerateMealPlanInput
): string {
  const requestedMealTypes = MEAL_TYPES.slice(0, input.mealsPerDay)

  return `Generate a ${input.numberOfDays}-day meal plan with ${input.mealsPerDay} meals per day.

Patient Profile:
- Name: ${patient.firstName} ${patient.lastName}
- Current weight: ${patient.weight || 'unknown'} kg
- Height: ${patient.height || 'unknown'} cm
- Target weight: ${patient.targetWeight || 'not set'} kg
- Activity level: ${patient.activityLevel || 'unknown'}
- Goals: ${patient.goals || 'general health'}
- Allergies: ${patient.allergies.length > 0 ? patient.allergies.join(', ') : 'none'}
- Dietary restrictions: ${patient.dietaryRestrictions.length > 0 ? patient.dietaryRestrictions.join(', ') : 'none'}

${input.calorieTarget ? `Target calories: ${input.calorieTarget} kcal/day` : ''}
${input.proteinTarget ? `Target protein: ${input.proteinTarget}g/day` : ''}
${input.preferences ? `Preferences: ${input.preferences}` : ''}
${input.restrictions ? `Additional restrictions: ${input.restrictions}` : ''}

IMPORTANT: Return a JSON object with this exact structure:
{
  "days": [
    {
      "dayOfWeek": "MONDAY",
      "meals": [
        {
          "mealType": "BREAKFAST",
          "name": "Healthy Breakfast",
          "time": "07:00",
          "foodItems": [
            { "name": "Oatmeal with berries", "quantity": 1, "unit": "bowl", "calories": 300, "protein": 10, "carbs": 50, "fat": 8 }
          ]
        }
      ]
    }
  ]
}

Each day must have ${input.mealsPerDay} meals with mealType from: ${requestedMealTypes.join(', ')}.
Each meal must have 2-5 realistic food items with name, quantity, unit, calories, protein, carbs, and fat (all as numbers in grams).
Use varied, nutritious, real food items appropriate for each meal type. Avoid placeholders.`
}

/** Default fallback models to try when the primary model is unavailable */
const DEFAULT_FALLBACK_MODELS = [
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct',
]

async function callAI(prompt: string): Promise<AIMealPlanDay[]> {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-...') {
    throw new Error('AI API key not configured. Set AI_API_KEY (or OPENAI_API_KEY).')
  }

  const baseUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1'
  const primaryModel = process.env.AI_MODEL || 'openai/gpt-4o'

  const fallbackModels = process.env.AI_FALLBACK_MODELS
    ? process.env.AI_FALLBACK_MODELS.split(',').map(m => m.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_MODELS

  const modelsToTry = [primaryModel, ...fallbackModels]
  const isOpenRouter = baseUrl.includes('openrouter.ai')

  if (modelsToTry.length === 0) {
    throw new Error('No AI models configured. Set AI_MODEL env var.')
  }

  let lastError: Error | null = null

  for (const model of modelsToTry) {
    try {
      const result = await callAIWithModel(baseUrl, apiKey, model, prompt, isOpenRouter)
      return result
    } catch (error) {
      lastError = error as Error
      const isRetryable = lastError.name === 'SyntaxError'
        || lastError.message.includes(': 404 ')
        || lastError.message.includes('Empty response')
      if (isRetryable && model !== modelsToTry[modelsToTry.length - 1]) {
        logger.warn({ model, error: lastError.message }, 'Model unavailable, trying next fallback')
        continue
      }
      throw lastError
    }
  }

  throw lastError!
}

async function callAIWithModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  isOpenRouter: boolean,
): Promise<AIMealPlanDay[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }

  // OpenRouter recommends these headers for proper routing
  if (isOpenRouter) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nutriforyou.app'
    headers['HTTP-Referer'] = appUrl
    headers['X-Title'] = 'NutriForYou'
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: Record<string, any> = {
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a professional nutritionist assistant. Generate structured meal plans in JSON format. Return only valid JSON array.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 8192,
  }

  // OpenRouter provider settings to avoid privacy/data policy 404s
  if (isOpenRouter) {
    requestBody.provider = {
      allow_fallbacks: true,
      data_collection: 'allow',
    }
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error (${baseUrl}): ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) throw new Error('Empty response from AI')

  const parsed = tryParseJSON(content)
  return parsed.days || parsed
}

/**
 * Attempt to parse JSON content, with basic repair for truncated responses.
 * AI models can hit token limits and return truncated JSON.
 */
function tryParseJSON(content: string): { days?: AIMealPlanDay[] } & AIMealPlanDay[] {
  // First try direct parse
  try {
    return JSON.parse(content)
  } catch {
    // Attempt to repair truncated JSON by closing open brackets
    logger.warn('AI response is not valid JSON, attempting repair')
  }

  // Try to find the last complete meal object and close the JSON
  let repaired = content.trim()

  // Remove any trailing incomplete string or value
  // Find the last complete object by looking for the last },
  const lastCompleteComma = repaired.lastIndexOf('},')
  const lastCompleteBrace = repaired.lastIndexOf('}]')

  const cutPoint = Math.max(lastCompleteComma, lastCompleteBrace)

  if (cutPoint > 0) {
    repaired = repaired.substring(0, cutPoint + 1)

    // Count open brackets and close them in correct nesting order
    const openStack: string[] = []
    for (const ch of repaired) {
      if (ch === '{' || ch === '[') openStack.push(ch)
      else if (ch === '}' || ch === ']') openStack.pop()
    }

    // Close in reverse order (innermost first)
    while (openStack.length > 0) {
      const opener = openStack.pop()
      repaired += opener === '{' ? '}' : ']'
    }

    try {
      const result = JSON.parse(repaired)
      logger.info('Successfully repaired truncated AI JSON response')
      return result
    } catch {
      // Repair failed, throw original error
    }
  }

  // If repair fails, re-parse to throw the original SyntaxError
  JSON.parse(content)
  // Should never reach here, but just in case:
  throw new Error('Failed to parse AI response as JSON')
}

/** Sample food items per meal type for the fallback plan */
const SAMPLE_FOODS: Record<string, { name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[][]> = {
  BREAKFAST: [
    [
      { name: 'Oatmeal with banana', quantity: 200, unit: 'g', calories: 230, protein: 8, carbs: 42, fat: 4 },
      { name: 'Greek yogurt', quantity: 150, unit: 'g', calories: 130, protein: 15, carbs: 8, fat: 5 },
      { name: 'Orange juice', quantity: 200, unit: 'ml', calories: 90, protein: 1, carbs: 21, fat: 0 },
    ],
    [
      { name: 'Scrambled eggs', quantity: 2, unit: 'eggs', calories: 180, protein: 12, carbs: 2, fat: 14 },
      { name: 'Whole wheat toast', quantity: 2, unit: 'slices', calories: 160, protein: 6, carbs: 28, fat: 3 },
      { name: 'Fresh fruit salad', quantity: 150, unit: 'g', calories: 75, protein: 1, carbs: 18, fat: 0 },
    ],
    [
      { name: 'Whole grain cereal', quantity: 60, unit: 'g', calories: 220, protein: 6, carbs: 44, fat: 2 },
      { name: 'Skimmed milk', quantity: 250, unit: 'ml', calories: 90, protein: 8, carbs: 12, fat: 1 },
      { name: 'Blueberries', quantity: 100, unit: 'g', calories: 57, protein: 1, carbs: 14, fat: 0 },
    ],
  ],
  MORNING_SNACK: [
    [
      { name: 'Apple', quantity: 1, unit: 'medium', calories: 95, protein: 0, carbs: 25, fat: 0 },
      { name: 'Almonds', quantity: 30, unit: 'g', calories: 170, protein: 6, carbs: 6, fat: 15 },
    ],
    [
      { name: 'Banana', quantity: 1, unit: 'medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Peanut butter', quantity: 15, unit: 'g', calories: 90, protein: 4, carbs: 3, fat: 8 },
    ],
    [
      { name: 'Rice cakes', quantity: 2, unit: 'pieces', calories: 70, protein: 2, carbs: 14, fat: 1 },
      { name: 'Cottage cheese', quantity: 100, unit: 'g', calories: 98, protein: 11, carbs: 3, fat: 4 },
    ],
  ],
  LUNCH: [
    [
      { name: 'Grilled chicken breast', quantity: 150, unit: 'g', calories: 230, protein: 35, carbs: 0, fat: 9 },
      { name: 'Brown rice', quantity: 150, unit: 'g', calories: 170, protein: 4, carbs: 36, fat: 1 },
      { name: 'Mixed green salad', quantity: 150, unit: 'g', calories: 35, protein: 2, carbs: 6, fat: 0 },
    ],
    [
      { name: 'Grilled salmon fillet', quantity: 150, unit: 'g', calories: 280, protein: 30, carbs: 0, fat: 17 },
      { name: 'Quinoa', quantity: 120, unit: 'g', calories: 140, protein: 5, carbs: 25, fat: 2 },
      { name: 'Steamed broccoli', quantity: 100, unit: 'g', calories: 35, protein: 3, carbs: 7, fat: 0 },
    ],
    [
      { name: 'Turkey wrap', quantity: 1, unit: 'wrap', calories: 300, protein: 25, carbs: 30, fat: 10 },
      { name: 'Tomato soup', quantity: 200, unit: 'ml', calories: 90, protein: 2, carbs: 16, fat: 2 },
    ],
  ],
  AFTERNOON_SNACK: [
    [
      { name: 'Protein bar', quantity: 1, unit: 'bar', calories: 200, protein: 15, carbs: 22, fat: 7 },
    ],
    [
      { name: 'Mixed nuts', quantity: 30, unit: 'g', calories: 175, protein: 5, carbs: 6, fat: 16 },
      { name: 'Dried apricots', quantity: 30, unit: 'g', calories: 70, protein: 1, carbs: 18, fat: 0 },
    ],
    [
      { name: 'Hummus', quantity: 60, unit: 'g', calories: 100, protein: 5, carbs: 8, fat: 6 },
      { name: 'Carrot sticks', quantity: 100, unit: 'g', calories: 35, protein: 1, carbs: 8, fat: 0 },
    ],
  ],
  DINNER: [
    [
      { name: 'Baked cod', quantity: 180, unit: 'g', calories: 190, protein: 40, carbs: 0, fat: 2 },
      { name: 'Sweet potato', quantity: 200, unit: 'g', calories: 180, protein: 4, carbs: 42, fat: 0 },
      { name: 'Steamed green beans', quantity: 100, unit: 'g', calories: 35, protein: 2, carbs: 7, fat: 0 },
    ],
    [
      { name: 'Lean beef steak', quantity: 150, unit: 'g', calories: 260, protein: 36, carbs: 0, fat: 12 },
      { name: 'Baked potato', quantity: 200, unit: 'g', calories: 160, protein: 4, carbs: 36, fat: 0 },
      { name: 'Mixed vegetables', quantity: 150, unit: 'g', calories: 65, protein: 3, carbs: 12, fat: 1 },
    ],
    [
      { name: 'Chicken stir-fry', quantity: 250, unit: 'g', calories: 300, protein: 28, carbs: 20, fat: 12 },
      { name: 'Basmati rice', quantity: 150, unit: 'g', calories: 180, protein: 4, carbs: 40, fat: 0 },
    ],
  ],
  EVENING_SNACK: [
    [
      { name: 'Chamomile tea', quantity: 250, unit: 'ml', calories: 2, protein: 0, carbs: 0, fat: 0 },
      { name: 'Dark chocolate (70%)', quantity: 20, unit: 'g', calories: 120, protein: 2, carbs: 10, fat: 8 },
    ],
    [
      { name: 'Warm milk', quantity: 200, unit: 'ml', calories: 100, protein: 7, carbs: 10, fat: 4 },
      { name: 'Oat cookie', quantity: 1, unit: 'piece', calories: 80, protein: 2, carbs: 14, fat: 3 },
    ],
    [
      { name: 'Greek yogurt', quantity: 120, unit: 'g', calories: 100, protein: 12, carbs: 6, fat: 4 },
      { name: 'Honey', quantity: 10, unit: 'g', calories: 30, protein: 0, carbs: 8, fat: 0 },
    ],
  ],
}

function generateFallbackPlan(input: GenerateMealPlanInput): AIMealPlanDay[] {
  const days: AIMealPlanDay[] = []
  for (let i = 0; i < input.numberOfDays; i++) {
    const meals = []
    for (let j = 0; j < input.mealsPerDay; j++) {
      const mealType = MEAL_TYPES[j]
      const sampleVariants = SAMPLE_FOODS[mealType]
      const variant = sampleVariants[i % sampleVariants.length]

      meals.push({
        mealType,
        name: `${mealType.replace(/_/g, ' ').toLowerCase()} — Day ${i + 1}`,
        time: MEAL_TIMES[j],
        foodItems: variant.map(fi => ({ ...fi })),
      })
    }

    days.push({
      dayOfWeek: DAY_NAMES[i % 7],
      meals,
    })
  }

  return days
}
