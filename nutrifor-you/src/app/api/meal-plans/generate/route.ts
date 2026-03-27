import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateMealPlan } from '@/services/ai-meal-plan.service'
import { generateMealPlanSchema } from '@/validators/meal-plan.schema'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = generateMealPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const mealPlan = await generateMealPlan(session.user.id, validation.data)
    return NextResponse.json({ data: mealPlan }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to generate meal plan')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
