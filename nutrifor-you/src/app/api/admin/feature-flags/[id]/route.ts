import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateFeatureFlag, deleteFeatureFlag } from '@/services/admin.service'
import { updateFeatureFlagSchema } from '@/validators/admin.schema'
import { logger } from '@/lib/logger'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const validation = updateFeatureFlagSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const flag = await updateFeatureFlag(id, validation.data, session.user.id)
    return NextResponse.json({ data: flag })
  } catch (error) {
    if ((error as Error).message === 'Feature flag not found') {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update feature flag')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    await deleteFeatureFlag(id, session.user.id)
    return NextResponse.json({ message: 'Feature flag deleted' })
  } catch (error) {
    if ((error as Error).message === 'Feature flag not found') {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete feature flag')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
