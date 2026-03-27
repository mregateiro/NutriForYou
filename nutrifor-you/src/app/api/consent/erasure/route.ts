import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requestDataErasure } from '@/services/consent.service'
import { dataErasureRequestSchema } from '@/validators/consent.schema'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = dataErasureRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const result = await requestDataErasure(
      session.user.id,
      validation.data.confirmEmail,
      validation.data.reason
    )
    return NextResponse.json({ data: result })
  } catch (error) {
    if ((error as Error).message === 'Email confirmation does not match') {
      return NextResponse.json({ error: 'Email confirmation does not match' }, { status: 400 })
    }
    logger.error({ error }, 'Failed to process data erasure')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
