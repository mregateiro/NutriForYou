import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listLandingPages, createLandingPage } from '@/services/blog.service'
import { createLandingPageSchema } from '@/validators/blog.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pages = await listLandingPages(session.user.id)
    return NextResponse.json({ data: pages })
  } catch (error) {
    logger.error({ error }, 'Failed to list landing pages')
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
    const input = createLandingPageSchema.parse(body)
    const page = await createLandingPage(session.user.id, input)
    return NextResponse.json({ data: page }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create landing page')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
