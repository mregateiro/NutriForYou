import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFinancialSummary } from '@/services/payment.service'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await getFinancialSummary(session.user.id)
    return NextResponse.json({ data: summary })
  } catch (error) {
    logger.error({ error }, 'Failed to get financial summary')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
