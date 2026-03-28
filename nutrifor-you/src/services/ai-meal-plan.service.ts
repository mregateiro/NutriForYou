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

  try {
    days = await callAI(prompt)
  } catch (error) {
    logger.warn({ error }, 'AI call failed, using fallback template')
    days = generateFallbackPlan(input)
  }

  // Create meal plan in database
  const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

  const mealPlan = await prisma.mealPlan.create({
    data: {
      patientId: input.patientId,
      nutritionistId,
      title: input.title,
      description: `AI-generated meal plan for ${patient.firstName} ${patient.lastName}`,
      status: MealPlanStatus.DRAFT,
      aiGenerated: true,
      aiPrompt: prompt,
      days: {
        create: days.map((day, index) => ({
          dayOfWeek: (day.dayOfWeek || dayNames[index % 7]) as 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY',
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

Return a JSON array of days, each with meals containing food items with nutritional info.`
}

async function callAI(prompt: string): Promise<AIMealPlanDay[]> {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-...') {
    throw new Error('AI API key not configured. Set AI_API_KEY (or OPENAI_API_KEY).')
  }

  const baseUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1'
  const model = process.env.AI_MODEL || 'openai/gpt-4o'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
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
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error (${baseUrl}): ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) throw new Error('Empty response from AI')

  const parsed = JSON.parse(content)
  return parsed.days || parsed
}

function generateFallbackPlan(input: GenerateMealPlanInput): AIMealPlanDay[] {
  const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  const mealTypes = ['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK']
  const mealTimes = ['07:00', '10:00', '12:30', '15:30', '19:00', '21:00']

  const targetCal = input.calorieTarget || 2000
  const calPerMeal = targetCal / input.mealsPerDay

  const days: AIMealPlanDay[] = []
  for (let i = 0; i < input.numberOfDays; i++) {
    const meals = []
    for (let j = 0; j < input.mealsPerDay; j++) {
      meals.push({
        mealType: mealTypes[j],
        name: `${mealTypes[j].replace(/_/g, ' ').toLowerCase()} — Day ${i + 1}`,
        time: mealTimes[j],
        foodItems: [
          {
            name: 'Placeholder — customize this item',
            quantity: 1,
            unit: 'serving',
            calories: Math.round(calPerMeal),
            protein: Math.round(calPerMeal * 0.25 / 4),
            carbs: Math.round(calPerMeal * 0.45 / 4),
            fat: Math.round(calPerMeal * 0.30 / 9),
          },
        ],
      })
    }

    days.push({
      dayOfWeek: dayNames[i % 7],
      meals,
    })
  }

  return days
}
