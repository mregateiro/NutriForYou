import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMealPlanById, updateMealPlan, deleteMealPlan } from '@/services/meal-plan.service'
import { updateMealPlanSchema } from '@/validators/meal-plan.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const mealPlan = await getMealPlanById(id, session.user.id)
    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }
    return NextResponse.json({ data: mealPlan })
  } catch (error) {
    logger.error({ error }, 'Failed to get meal plan')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const validation = updateMealPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const mealPlan = await updateMealPlan(id, session.user.id, validation.data)
    return NextResponse.json({ data: mealPlan })
  } catch (error) {
    if ((error as Error).message === 'Meal plan not found') {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update meal plan')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await deleteMealPlan(id, session.user.id)
    return NextResponse.json({ message: 'Meal plan deleted' })
  } catch (error) {
    if ((error as Error).message === 'Meal plan not found') {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete meal plan')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
