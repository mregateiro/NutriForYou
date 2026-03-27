import { z } from 'zod'

const foodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  notes: z.string().optional(),
})

const mealSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK']),
  name: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
  foodItems: z.array(foodItemSchema).default([]),
})

const daySchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  date: z.string().optional(),
  notes: z.string().optional(),
  meals: z.array(mealSchema).default([]),
})

export const createMealPlanSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  days: z.array(daySchema).default([]),
})

export const generateMealPlanSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  title: z.string().min(1).max(200),
  preferences: z.string().optional(),
  restrictions: z.string().optional(),
  calorieTarget: z.number().positive().optional(),
  proteinTarget: z.number().min(0).optional(),
  numberOfDays: z.number().int().min(1).max(7).default(7),
  mealsPerDay: z.number().int().min(3).max(6).default(5),
})

export const updateMealPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
})

export const saveMealPlanTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  mealPlanId: z.string().min(1, 'Meal plan ID is required'),
})

export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>
export type GenerateMealPlanInput = z.infer<typeof generateMealPlanSchema>
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>
export type SaveMealPlanTemplateInput = z.infer<typeof saveMealPlanTemplateSchema>
