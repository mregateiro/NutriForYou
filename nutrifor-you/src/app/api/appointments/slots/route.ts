import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAvailableSlots } from '@/services/appointment.service'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const date = url.searchParams.get('date')
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const slots = await getAvailableSlots(session.user.id, date)
    return NextResponse.json({ data: slots })
  } catch (error) {
    logger.error({ error }, 'Failed to get available slots')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
