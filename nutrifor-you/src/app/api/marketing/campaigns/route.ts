import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listCampaigns, createCampaign } from '@/services/marketing.service'
import { createCampaignSchema } from '@/validators/marketing.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const result = await listCampaigns({
      status: url.searchParams.get('status') || undefined,
      type: url.searchParams.get('type') || undefined,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list campaigns')
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
    const input = createCampaignSchema.parse(body)
    const campaign = await createCampaign(session.user.id, input)
    return NextResponse.json({ data: campaign }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create campaign')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
