import { AuditAction, MealPlanStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from './audit.service'
import { logger } from '@/lib/logger'
import type {
  CreateMealPlanInput,
  UpdateMealPlanInput,
  SaveMealPlanTemplateInput,
} from '@/validators/meal-plan.schema'

export async function createMealPlan(
  nutritionistId: string,
  input: CreateMealPlanInput
) {
  // Verify patient
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, nutritionistId, isActive: true },
  })
  if (!patient) throw new Error('Patient not found')

  const mealPlan = await prisma.mealPlan.create({
    data: {
      patientId: input.patientId,
      nutritionistId,
      title: input.title,
      description: input.description,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      notes: input.notes,
      status: MealPlanStatus.DRAFT,
      days: {
        create: input.days.map(day => ({
          dayOfWeek: day.dayOfWeek,
          date: day.date ? new Date(day.date) : undefined,
          notes: day.notes,
          meals: {
            create: day.meals.map(meal => ({
              mealType: meal.mealType,
              name: meal.name,
              time: meal.time,
              notes: meal.notes,
              totalCalories: meal.foodItems.reduce((sum, fi) => sum + (fi.calories || 0), 0),
              totalProtein: meal.foodItems.reduce((sum, fi) => sum + (fi.protein || 0), 0),
              totalCarbs: meal.foodItems.reduce((sum, fi) => sum + (fi.carbs || 0), 0),
              totalFat: meal.foodItems.reduce((sum, fi) => sum + (fi.fat || 0), 0),
              foodItems: {
                create: meal.foodItems,
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

  // Calculate totals
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0

  for (const day of mealPlan.days) {
    for (const meal of day.meals) {
      totalCalories += meal.totalCalories || 0
      totalProtein += meal.totalProtein || 0
      totalCarbs += meal.totalCarbs || 0
      totalFat += meal.totalFat || 0
    }
  }

  const dayCount = mealPlan.days.length || 1
  await prisma.mealPlan.update({
    where: { id: mealPlan.id },
    data: {
      totalCalories: totalCalories / dayCount,
      totalProtein: totalProtein / dayCount,
      totalCarbs: totalCarbs / dayCount,
      totalFat: totalFat / dayCount,
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.CREATE,
    entity: 'MealPlan',
    entityId: mealPlan.id,
    details: { patientId: input.patientId, dayCount: mealPlan.days.length },
  })

  logger.info({ mealPlanId: mealPlan.id, nutritionistId }, 'Meal plan created')
  return mealPlan
}

export async function getMealPlanById(id: string, nutritionistId: string) {
  return prisma.mealPlan.findFirst({
    where: { id, nutritionistId },
    include: {
      patient: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          allergies: true, dietaryRestrictions: true,
          weight: true, height: true, targetWeight: true,
        },
      },
      days: {
        orderBy: { dayOfWeek: 'asc' },
        include: {
          meals: {
            orderBy: { mealType: 'asc' },
            include: {
              foodItems: true,
            },
          },
        },
      },
    },
  })
}

export async function updateMealPlan(
  id: string,
  nutritionistId: string,
  input: UpdateMealPlanInput
) {
  const existing = await prisma.mealPlan.findFirst({
    where: { id, nutritionistId },
  })
  if (!existing) throw new Error('Meal plan not found')

  const mealPlan = await prisma.mealPlan.update({
    where: { id },
    data: {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
  })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.UPDATE,
    entity: 'MealPlan',
    entityId: id,
    details: { updatedFields: Object.keys(input) },
  })

  return mealPlan
}

export async function listMealPlans(
  nutritionistId: string,
  params: { patientId?: string; status?: string; page?: number; perPage?: number }
) {
  const { page = 1, perPage = 20, patientId, status } = params
  const where: Record<string, unknown> = { nutritionistId }

  if (patientId) where.patientId = patientId
  if (status) where.status = status

  const [mealPlans, total] = await Promise.all([
    prisma.mealPlan.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { days: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.mealPlan.count({ where }),
  ])

  return {
    data: mealPlans,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function deleteMealPlan(id: string, nutritionistId: string) {
  const existing = await prisma.mealPlan.findFirst({
    where: { id, nutritionistId },
  })
  if (!existing) throw new Error('Meal plan not found')

  await prisma.mealPlan.delete({ where: { id } })

  await createAuditLog({
    userId: nutritionistId,
    action: AuditAction.DELETE,
    entity: 'MealPlan',
    entityId: id,
  })

  logger.info({ mealPlanId: id, nutritionistId }, 'Meal plan deleted')
}

export async function saveMealPlanAsTemplate(
  nutritionistId: string,
  input: SaveMealPlanTemplateInput
) {
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { id: input.mealPlanId, nutritionistId },
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

  if (!mealPlan) throw new Error('Meal plan not found')

  // Serialize meal plan structure as template content
  const templateContent = mealPlan.days.map(day => ({
    dayOfWeek: day.dayOfWeek,
    meals: day.meals.map(meal => ({
      mealType: meal.mealType,
      name: meal.name,
      time: meal.time,
      foodItems: meal.foodItems.map(fi => ({
        name: fi.name,
        quantity: fi.quantity,
        unit: fi.unit,
        calories: fi.calories,
        protein: fi.protein,
        carbs: fi.carbs,
        fat: fi.fat,
      })),
    })),
  }))

  const template = await prisma.mealPlanTemplate.create({
    data: {
      nutritionistId,
      name: input.name,
      description: input.description,
      content: templateContent,
    },
  })

  logger.info({ templateId: template.id, nutritionistId }, 'Meal plan template saved')
  return template
}

export async function listMealPlanTemplates(nutritionistId: string) {
  return prisma.mealPlanTemplate.findMany({
    where: { nutritionistId },
    orderBy: { name: 'asc' },
  })
}
