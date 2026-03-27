import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exportUserData } from '@/services/consent.service'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await exportUserData(session.user.id)
    return NextResponse.json({ data })
  } catch (error) {
    logger.error({ error }, 'Failed to export user data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
