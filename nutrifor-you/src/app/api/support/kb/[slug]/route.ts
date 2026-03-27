import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getKBArticle, updateKBArticle, deleteKBArticle } from '@/services/support.service'
import { updateKBArticleSchema } from '@/validators/support.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const article = await getKBArticle(slug)
    return NextResponse.json({ data: article })
  } catch (error) {
    if ((error as Error).message === 'Article not found') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get KB article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { slug } = await params
    const article = await getKBArticle(slug)
    const body = await req.json()
    const input = updateKBArticleSchema.parse(body)
    const updated = await updateKBArticle(article.id, input)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if ((error as Error).message === 'Article not found') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update KB article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { slug } = await params
    const article = await getKBArticle(slug)
    await deleteKBArticle(article.id)
    return NextResponse.json({ message: 'Article deleted' })
  } catch (error) {
    if ((error as Error).message === 'Article not found') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete KB article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
