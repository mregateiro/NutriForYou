import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateContactSegment, deleteContactSegment } from '@/services/marketing.service'
import { updateContactSegmentSchema } from '@/validators/marketing.schema'
import { logger } from '@/lib/logger'

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
    const input = updateContactSegmentSchema.parse(body)
    const segment = await updateContactSegment(id, input)
    return NextResponse.json({ data: segment })
  } catch (error) {
    if ((error as Error).message === 'Segment not found') {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update segment')
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
    await deleteContactSegment(id)
    return NextResponse.json({ message: 'Segment deleted' })
  } catch (error) {
    logger.error({ error }, 'Failed to delete segment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
