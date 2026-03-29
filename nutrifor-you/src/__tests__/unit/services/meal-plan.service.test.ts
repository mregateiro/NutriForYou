import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import {
  buildMealPlan,
  buildMealPlanDay,
  buildMeal,
  buildFoodItem,
  buildPatient,
} from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createMealPlan
// ---------------------------------------------------------------------------
describe('createMealPlan', () => {
  it('creates meal plan with correct average totals', async () => {
    const patient = buildPatient()

    const food1 = buildFoodItem({ calories: 500, protein: 30, carbs: 60, fat: 15 })
    const food2 = buildFoodItem({ calories: 500, protein: 30, carbs: 60, fat: 15 })

    const meal1 = buildMeal({
      totalCalories: 500,
      totalProtein: 30,
      totalCarbs: 60,
      totalFat: 15,
      foodItems: [food1],
    })
    const meal2 = buildMeal({
      totalCalories: 500,
      totalProtein: 30,
      totalCarbs: 60,
      totalFat: 15,
      foodItems: [food2],
    })

    const day1 = buildMealPlanDay({ meals: [meal1] })
    const day2 = buildMealPlanDay({ dayOfWeek: 'TUESDAY', meals: [meal2] })

    const createdPlan = buildMealPlan({ days: [day1, day2] })
    const updatedPlan = buildMealPlan({
      id: createdPlan.id,
      totalCalories: 500,
      totalProtein: 30,
      totalCarbs: 60,
      totalFat: 15,
    })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(createdPlan)
    prisma.mealPlan.update.mockResolvedValue(updatedPlan)

    const { createMealPlan } = await import('@/services/meal-plan.service')
    const input = {
      patientId: patient.id,
      title: 'Weight Loss Plan',
      description: 'A balanced plan',
      notes: null,
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      days: [
        {
          dayOfWeek: 'MONDAY',
          notes: null,
          meals: [
            {
              mealType: 'BREAKFAST',
              name: 'Breakfast',
              time: '08:00',
              notes: null,
              foodItems: [{ name: 'Oatmeal', quantity: 100, unit: 'g', calories: 500, protein: 30, carbs: 60, fat: 15 }],
            },
          ],
        },
        {
          dayOfWeek: 'TUESDAY',
          notes: null,
          meals: [
            {
              mealType: 'BREAKFAST',
              name: 'Breakfast',
              time: '08:00',
              notes: null,
              foodItems: [{ name: 'Granola', quantity: 80, unit: 'g', calories: 500, protein: 30, carbs: 60, fat: 15 }],
            },
          ],
        },
      ],
    }

    const result = await createMealPlan('test-nutritionist-id', input as never)

    expect(result).toEqual(createdPlan)
    // averages: total 1000 / 2 days = 500 each
    expect(prisma.mealPlan.update).toHaveBeenCalledWith({
      where: { id: createdPlan.id },
      data: {
        totalCalories: 500,
        totalProtein: 30,
        totalCarbs: 60,
        totalFat: 15,
      },
    })
  })

  it('throws "Patient not found" when patient does not exist', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { createMealPlan } = await import('@/services/meal-plan.service')
    const input = { patientId: 'unknown-id', title: 'Plan', days: [] }

    await expect(
      createMealPlan('test-nutritionist-id', input as never),
    ).rejects.toThrow('Patient not found')
  })

  it('logs an audit entry on creation', async () => {
    const patient = buildPatient()
    const meal = buildMeal({
      totalCalories: 200,
      totalProtein: 10,
      totalCarbs: 30,
      totalFat: 5,
      foodItems: [buildFoodItem()],
    })
    const day = buildMealPlanDay({ meals: [meal] })
    const createdPlan = buildMealPlan({ days: [day] })

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(createdPlan)
    prisma.mealPlan.update.mockResolvedValue(createdPlan)

    const { createMealPlan } = await import('@/services/meal-plan.service')
    const input = {
      patientId: patient.id,
      title: 'Plan',
      days: [
        {
          dayOfWeek: 'MONDAY',
          meals: [
            {
              mealType: 'LUNCH',
              name: 'Lunch',
              time: '12:00',
              foodItems: [{ name: 'Rice', quantity: 100, unit: 'g', calories: 200, protein: 10, carbs: 30, fat: 5 }],
            },
          ],
        },
      ],
    }

    await createMealPlan('test-nutritionist-id', input as never)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-nutritionist-id',
      action: 'CREATE',
      entity: 'MealPlan',
      entityId: createdPlan.id,
      details: { patientId: patient.id, dayCount: 1 },
    })
  })

  it('verifies patient belongs to the nutritionist', async () => {
    const patient = buildPatient()

    prisma.patient.findFirst.mockResolvedValue(patient)
    prisma.mealPlan.create.mockResolvedValue(buildMealPlan({ days: [] }))
    prisma.mealPlan.update.mockResolvedValue(buildMealPlan())

    const { createMealPlan } = await import('@/services/meal-plan.service')
    const input = { patientId: patient.id, title: 'Plan', days: [] }

    await createMealPlan('test-nutritionist-id', input as never)

    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: patient.id, nutritionistId: 'test-nutritionist-id', isActive: true },
    })
  })
})

// ---------------------------------------------------------------------------
// getMealPlanById
// ---------------------------------------------------------------------------
describe('getMealPlanById', () => {
  it('returns meal plan by id and nutritionistId', async () => {
    const mealPlan = buildMealPlan()
    prisma.mealPlan.findFirst.mockResolvedValue(mealPlan)

    const { getMealPlanById } = await import('@/services/meal-plan.service')
    const result = await getMealPlanById(mealPlan.id, 'test-nutritionist-id')

    expect(result).toEqual(mealPlan)
    expect(prisma.mealPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mealPlan.id, nutritionistId: 'test-nutritionist-id' },
      }),
    )
  })

  it('returns null when meal plan is not found', async () => {
    prisma.mealPlan.findFirst.mockResolvedValue(null)

    const { getMealPlanById } = await import('@/services/meal-plan.service')
    const result = await getMealPlanById('nonexistent', 'test-nutritionist-id')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateMealPlan
// ---------------------------------------------------------------------------
describe('updateMealPlan', () => {
  it('updates a meal plan and converts dates', async () => {
    const existing = buildMealPlan()
    const updated = buildMealPlan({ title: 'Updated Plan' })

    prisma.mealPlan.findFirst.mockResolvedValue(existing)
    prisma.mealPlan.update.mockResolvedValue(updated)

    const { updateMealPlan } = await import('@/services/meal-plan.service')
    const input = {
      title: 'Updated Plan',
      startDate: '2024-06-01',
      endDate: '2024-06-30',
    }

    const result = await updateMealPlan(existing.id, 'test-nutritionist-id', input as never)

    expect(result).toEqual(updated)
    expect(prisma.mealPlan.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        title: 'Updated Plan',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
      }),
    })
  })

  it('throws "Meal plan not found" when plan does not exist', async () => {
    prisma.mealPlan.findFirst.mockResolvedValue(null)

    const { updateMealPlan } = await import('@/services/meal-plan.service')

    await expect(
      updateMealPlan('nonexistent', 'test-nutritionist-id', { title: 'X' } as never),
    ).rejects.toThrow('Meal plan not found')
  })

  it('logs an audit entry on update', async () => {
    const existing = buildMealPlan()
    const updated = buildMealPlan({ title: 'Updated' })

    prisma.mealPlan.findFirst.mockResolvedValue(existing)
    prisma.mealPlan.update.mockResolvedValue(updated)

    const { updateMealPlan } = await import('@/services/meal-plan.service')
    await updateMealPlan(existing.id, 'test-nutritionist-id', { title: 'Updated' } as never)

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-nutritionist-id',
      action: 'UPDATE',
      entity: 'MealPlan',
      entityId: existing.id,
      details: { updatedFields: ['title'] },
    })
  })
})

// ---------------------------------------------------------------------------
// listMealPlans
// ---------------------------------------------------------------------------
describe('listMealPlans', () => {
  it('returns paginated results with default page=1, perPage=20', async () => {
    const plans = [buildMealPlan(), buildMealPlan()]
    prisma.mealPlan.findMany.mockResolvedValue(plans)
    prisma.mealPlan.count.mockResolvedValue(2)

    const { listMealPlans } = await import('@/services/meal-plan.service')
    const result = await listMealPlans('test-nutritionist-id', {})

    expect(result).toEqual({
      data: plans,
      pagination: { page: 1, perPage: 20, total: 2, totalPages: 1 },
    })
    expect(prisma.mealPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: { nutritionistId: 'test-nutritionist-id' },
      }),
    )
  })

  it('applies patientId and status filters', async () => {
    prisma.mealPlan.findMany.mockResolvedValue([])
    prisma.mealPlan.count.mockResolvedValue(0)

    const { listMealPlans } = await import('@/services/meal-plan.service')
    await listMealPlans('test-nutritionist-id', {
      patientId: 'patient-1',
      status: 'ACTIVE',
      page: 2,
      perPage: 10,
    })

    expect(prisma.mealPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          nutritionistId: 'test-nutritionist-id',
          patientId: 'patient-1',
          status: 'ACTIVE',
        },
        skip: 10,
        take: 10,
      }),
    )
  })

  it('calculates totalPages correctly', async () => {
    prisma.mealPlan.findMany.mockResolvedValue([])
    prisma.mealPlan.count.mockResolvedValue(45)

    const { listMealPlans } = await import('@/services/meal-plan.service')
    const result = await listMealPlans('test-nutritionist-id', { perPage: 20 })

    expect(result.pagination).toEqual({
      page: 1,
      perPage: 20,
      total: 45,
      totalPages: 3,
    })
  })
})

// ---------------------------------------------------------------------------
// deleteMealPlan
// ---------------------------------------------------------------------------
describe('deleteMealPlan', () => {
  it('deletes an existing meal plan', async () => {
    const existing = buildMealPlan()
    prisma.mealPlan.findFirst.mockResolvedValue(existing)
    prisma.mealPlan.delete.mockResolvedValue(existing)

    const { deleteMealPlan } = await import('@/services/meal-plan.service')
    await deleteMealPlan(existing.id, 'test-nutritionist-id')

    expect(prisma.mealPlan.findFirst).toHaveBeenCalledWith({
      where: { id: existing.id, nutritionistId: 'test-nutritionist-id' },
    })
    expect(prisma.mealPlan.delete).toHaveBeenCalledWith({
      where: { id: existing.id },
    })
  })

  it('throws "Meal plan not found" when plan does not exist', async () => {
    prisma.mealPlan.findFirst.mockResolvedValue(null)

    const { deleteMealPlan } = await import('@/services/meal-plan.service')

    await expect(
      deleteMealPlan('nonexistent', 'test-nutritionist-id'),
    ).rejects.toThrow('Meal plan not found')
  })

  it('logs an audit entry on deletion', async () => {
    const existing = buildMealPlan()
    prisma.mealPlan.findFirst.mockResolvedValue(existing)
    prisma.mealPlan.delete.mockResolvedValue(existing)

    const { deleteMealPlan } = await import('@/services/meal-plan.service')
    await deleteMealPlan(existing.id, 'test-nutritionist-id')

    const { createAuditLog } = await import('@/services/audit.service')
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'test-nutritionist-id',
      action: 'DELETE',
      entity: 'MealPlan',
      entityId: existing.id,
    })
  })
})

// ---------------------------------------------------------------------------
// saveMealPlanAsTemplate
// ---------------------------------------------------------------------------
describe('saveMealPlanAsTemplate', () => {
  it('serializes meal plan structure as template content', async () => {
    const foodItem = buildFoodItem({
      name: 'Chicken',
      quantity: 200,
      unit: 'g',
      calories: 400,
      protein: 40,
      carbs: 0,
      fat: 10,
    })
    const meal = buildMeal({
      mealType: 'LUNCH',
      name: 'Lunch',
      time: '12:00',
      foodItems: [foodItem],
    })
    const day = buildMealPlanDay({
      dayOfWeek: 'MONDAY',
      meals: [meal],
    })
    const mealPlan = buildMealPlan({ days: [day] })

    const template = {
      id: 'template-1',
      nutritionistId: 'test-nutritionist-id',
      name: 'My Template',
      description: 'Template description',
      content: expect.any(Array),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    prisma.mealPlan.findFirst.mockResolvedValue(mealPlan)
    prisma.mealPlanTemplate.create.mockResolvedValue(template)

    const { saveMealPlanAsTemplate } = await import('@/services/meal-plan.service')
    const input = {
      mealPlanId: mealPlan.id,
      name: 'My Template',
      description: 'Template description',
    }

    const result = await saveMealPlanAsTemplate('test-nutritionist-id', input as never)

    expect(result).toEqual(template)
    expect(prisma.mealPlanTemplate.create).toHaveBeenCalledWith({
      data: {
        nutritionistId: 'test-nutritionist-id',
        name: 'My Template',
        description: 'Template description',
        content: [
          {
            dayOfWeek: 'MONDAY',
            meals: [
              {
                mealType: 'LUNCH',
                name: 'Lunch',
                time: '12:00',
                foodItems: [
                  {
                    name: 'Chicken',
                    quantity: 200,
                    unit: 'g',
                    calories: 400,
                    protein: 40,
                    carbs: 0,
                    fat: 10,
                  },
                ],
              },
            ],
          },
        ],
      },
    })
  })

  it('throws "Meal plan not found" when plan does not exist', async () => {
    prisma.mealPlan.findFirst.mockResolvedValue(null)

    const { saveMealPlanAsTemplate } = await import('@/services/meal-plan.service')
    const input = { mealPlanId: 'nonexistent', name: 'Template' }

    await expect(
      saveMealPlanAsTemplate('test-nutritionist-id', input as never),
    ).rejects.toThrow('Meal plan not found')
  })
})

// ---------------------------------------------------------------------------
// listMealPlanTemplates
// ---------------------------------------------------------------------------
describe('listMealPlanTemplates', () => {
  it('returns templates ordered by name ascending', async () => {
    const templates = [
      { id: 'tpl-1', name: 'Alpha Template', nutritionistId: 'test-nutritionist-id' },
      { id: 'tpl-2', name: 'Beta Template', nutritionistId: 'test-nutritionist-id' },
    ]
    prisma.mealPlanTemplate.findMany.mockResolvedValue(templates)

    const { listMealPlanTemplates } = await import('@/services/meal-plan.service')
    const result = await listMealPlanTemplates('test-nutritionist-id')

    expect(result).toEqual(templates)
    expect(prisma.mealPlanTemplate.findMany).toHaveBeenCalledWith({
      where: { nutritionistId: 'test-nutritionist-id' },
      orderBy: { name: 'asc' },
    })
  })

  it('returns empty array when no templates exist', async () => {
    prisma.mealPlanTemplate.findMany.mockResolvedValue([])

    const { listMealPlanTemplates } = await import('@/services/meal-plan.service')
    const result = await listMealPlanTemplates('test-nutritionist-id')

    expect(result).toEqual([])
  })
})
