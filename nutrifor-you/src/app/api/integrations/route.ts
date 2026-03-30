import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ZodError } from 'zod'
import { authOptions } from '@/lib/auth'
import { listIntegrations, connectIntegration } from '@/services/integration.service'
import { connectIntegrationSchema } from '@/validators/integration.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const integrations = await listIntegrations(session.user.id)
    return NextResponse.json({ data: integrations })
  } catch (error) {
    logger.error({ error }, 'Failed to list integrations')
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
    const input = connectIntegrationSchema.parse(body)
    const integration = await connectIntegration(session.user.id, input)
    return NextResponse.json({ data: integration }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message || 'Invalid configuration' },
        { status: 400 }
      )
    }
    logger.error({ error }, 'Failed to connect integration')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
