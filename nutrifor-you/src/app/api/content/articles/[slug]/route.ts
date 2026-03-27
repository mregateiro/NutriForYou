import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getContentArticle, updateContentArticle, deleteContentArticle } from '@/services/content.service'
import { updateContentArticleSchema } from '@/validators/content.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const article = await getContentArticle(slug)
    return NextResponse.json({ data: article })
  } catch (error) {
    if ((error as Error).message === 'Article not found') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get content article')
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
    const article = await getContentArticle(slug)
    const body = await req.json()
    const input = updateContentArticleSchema.parse(body)
    const updated = await updateContentArticle(article.id, session.user.id, input)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if ((error as Error).message === 'Article not found') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update content article')
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
    const article = await getContentArticle(slug)
    await deleteContentArticle(article.id, session.user.id)
    return NextResponse.json({ message: 'Article deleted' })
  } catch (error) {
    if ((error as Error).message === 'Article not found') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete content article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
