import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createMealPlan, listMealPlans } from '@/services/meal-plan.service'
import { createMealPlanSchema } from '@/validators/meal-plan.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const result = await listMealPlans(session.user.id, {
      patientId: url.searchParams.get('patientId') || undefined,
      status: url.searchParams.get('status') || undefined,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })
    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list meal plans')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = createMealPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const mealPlan = await createMealPlan(session.user.id, validation.data)
    return NextResponse.json({ data: mealPlan }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to create meal plan')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
