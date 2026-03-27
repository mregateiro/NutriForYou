import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateIntegration, disconnectIntegration } from '@/services/integration.service'
import { updateIntegrationSchema } from '@/validators/integration.schema'
import { logger } from '@/lib/logger'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const input = updateIntegrationSchema.parse(body)
    const integration = await updateIntegration(session.user.id, id, input)
    return NextResponse.json({ data: integration })
  } catch (error) {
    if ((error as Error).message === 'Integration not found') {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update integration')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await disconnectIntegration(session.user.id, id)
    return NextResponse.json({ message: 'Integration disconnected' })
  } catch (error) {
    if ((error as Error).message === 'Integration not found') {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to disconnect integration')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
