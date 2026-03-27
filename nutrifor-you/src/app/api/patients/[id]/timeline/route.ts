import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPatientTimeline } from '@/services/patient.service'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const timeline = await getPatientTimeline(params.id, session.user.id)
    return NextResponse.json({ data: timeline })
  } catch (error) {
    if ((error as Error).message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get patient timeline')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
