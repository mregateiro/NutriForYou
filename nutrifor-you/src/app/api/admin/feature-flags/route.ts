import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listFeatureFlags, createFeatureFlag } from '@/services/admin.service'
import { createFeatureFlagSchema } from '@/validators/admin.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const flags = await listFeatureFlags()
    return NextResponse.json({ data: flags })
  } catch (error) {
    logger.error({ error }, 'Failed to list feature flags')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const validation = createFeatureFlagSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const flag = await createFeatureFlag(validation.data, session.user.id)
    return NextResponse.json({ data: flag }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create feature flag')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
