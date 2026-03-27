import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLandingPage, updateLandingPage, deleteLandingPage } from '@/services/blog.service'
import { updateLandingPageSchema } from '@/validators/blog.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const page = await getLandingPage(slug)
    return NextResponse.json({ data: page })
  } catch (error) {
    if ((error as Error).message === 'Page not found') {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get landing page')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slug } = await params
    const page = await getLandingPage(slug)
    const body = await req.json()
    const input = updateLandingPageSchema.parse(body)
    const updated = await updateLandingPage(page.id, input)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if ((error as Error).message === 'Page not found') {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update landing page')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slug } = await params
    const page = await getLandingPage(slug)
    await deleteLandingPage(page.id)
    return NextResponse.json({ message: 'Page deleted' })
  } catch (error) {
    if ((error as Error).message === 'Page not found') {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete landing page')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
