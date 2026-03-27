import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listContactSegments, createContactSegment } from '@/services/marketing.service'
import { createContactSegmentSchema } from '@/validators/marketing.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const segments = await listContactSegments()
    return NextResponse.json({ data: segments })
  } catch (error) {
    logger.error({ error }, 'Failed to list segments')
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
    const input = createContactSegmentSchema.parse(body)
    const segment = await createContactSegment(session.user.id, input)
    return NextResponse.json({ data: segment }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create segment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
