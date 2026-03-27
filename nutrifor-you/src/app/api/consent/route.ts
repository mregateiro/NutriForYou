import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { grantConsent, getConsents, getConsentHistory } from '@/services/consent.service'
import { grantConsentSchema } from '@/validators/consent.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const includeHistory = url.searchParams.get('history') === 'true'

    const consents = includeHistory
      ? await getConsentHistory(session.user.id)
      : await getConsents(session.user.id)

    return NextResponse.json({ data: consents })
  } catch (error) {
    logger.error({ error }, 'Failed to get consents')
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
    const validation = grantConsentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
    const consent = await grantConsent(session.user.id, validation.data, ipAddress)
    return NextResponse.json({ data: consent }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to record consent')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
