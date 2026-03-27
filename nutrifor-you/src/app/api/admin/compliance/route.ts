import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getComplianceStatus,
  enforceRetentionPolicies,
  reportBreach,
  listBreachReports,
} from '@/services/compliance.service'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [status, breachReports] = await Promise.all([
      getComplianceStatus(),
      Promise.resolve(listBreachReports()),
    ])

    return NextResponse.json({ data: { ...status, breachReports } })
  } catch (error) {
    logger.error({ error }, 'Failed to get compliance status')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { action } = body

    if (action === 'enforce-retention') {
      const results = await enforceRetentionPolicies(session.user.id)
      return NextResponse.json({ data: results })
    }

    if (action === 'report-breach') {
      const { severity, description, affectedUsers } = body
      if (!severity || !description) {
        return NextResponse.json({ error: 'severity and description are required' }, { status: 400 })
      }
      const report = await reportBreach(session.user.id, {
        severity,
        description,
        affectedUsers: affectedUsers || 0,
      })
      return NextResponse.json({ data: report }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    logger.error({ error }, 'Failed to perform compliance action')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
