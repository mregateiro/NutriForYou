import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDashboardAnalytics, getPatientAnalytics } from '@/services/analytics.service'
import { logger } from '@/lib/logger'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')

    if (patientId) {
      const analytics = await getPatientAnalytics(session.user.id, patientId)
      return NextResponse.json({ data: analytics })
    }

    const analytics = await getDashboardAnalytics(session.user.id)
    return NextResponse.json({ data: analytics })
  } catch (error) {
    if ((error as Error).message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get analytics')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
