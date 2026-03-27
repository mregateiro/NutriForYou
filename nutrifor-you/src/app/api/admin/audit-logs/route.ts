import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAuditLogs } from '@/services/audit.service'
import { logger } from '@/lib/logger'
import type { AuditAction } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const result = await getAuditLogs({
      userId: url.searchParams.get('userId') || undefined,
      entity: url.searchParams.get('entity') || undefined,
      action: (url.searchParams.get('action') as AuditAction) || undefined,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 50,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list audit logs')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
