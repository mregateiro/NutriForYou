import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { saveMealPlanAsTemplate, listMealPlanTemplates } from '@/services/meal-plan.service'
import { saveMealPlanTemplateSchema } from '@/validators/meal-plan.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const templates = await listMealPlanTemplates(session.user.id)
    return NextResponse.json({ data: templates })
  } catch (error) {
    logger.error({ error }, 'Failed to list meal plan templates')
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
    const validation = saveMealPlanTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const template = await saveMealPlanAsTemplate(session.user.id, validation.data)
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Meal plan not found') {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to save template')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
