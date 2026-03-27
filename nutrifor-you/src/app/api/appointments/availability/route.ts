import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createAvailabilityRule, listAvailabilityRules, deleteAvailabilityRule } from '@/services/appointment.service'
import { createAvailabilityRuleSchema } from '@/validators/appointment.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rules = await listAvailabilityRules(session.user.id)
    return NextResponse.json({ data: rules })
  } catch (error) {
    logger.error({ error }, 'Failed to list availability rules')
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
    const validation = createAvailabilityRuleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const rule = await createAvailabilityRule(session.user.id, validation.data)
    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create availability rule')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const ruleId = url.searchParams.get('id')
    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    await deleteAvailabilityRule(ruleId, session.user.id)
    return NextResponse.json({ message: 'Availability rule deleted' })
  } catch (error) {
    if ((error as Error).message === 'Availability rule not found') {
      return NextResponse.json({ error: 'Availability rule not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete availability rule')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
