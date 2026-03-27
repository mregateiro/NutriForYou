import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSystemStats } from '@/services/admin.service'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const stats = await getSystemStats()
    return NextResponse.json({ data: stats })
  } catch (error) {
    logger.error({ error }, 'Failed to get system stats')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
