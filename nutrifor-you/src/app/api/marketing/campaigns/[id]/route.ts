import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCampaign, updateCampaign, deleteCampaign } from '@/services/marketing.service'
import { updateCampaignSchema } from '@/validators/marketing.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const campaign = await getCampaign(id)
    return NextResponse.json({ data: campaign })
  } catch (error) {
    if ((error as Error).message === 'Campaign not found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get campaign')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const input = updateCampaignSchema.parse(body)
    const campaign = await updateCampaign(id, session.user.id, input)
    return NextResponse.json({ data: campaign })
  } catch (error) {
    if ((error as Error).message === 'Campaign not found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update campaign')
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
    await deleteCampaign(id, session.user.id)
    return NextResponse.json({ message: 'Campaign deleted' })
  } catch (error) {
    logger.error({ error }, 'Failed to delete campaign')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
