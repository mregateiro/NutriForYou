import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listKBArticles, createKBArticle } from '@/services/support.service'
import { createKBArticleSchema } from '@/validators/support.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const result = await listKBArticles({
      category: url.searchParams.get('category') || undefined,
      isPublished: url.searchParams.get('published') === 'false' ? false : true,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list KB articles')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const input = createKBArticleSchema.parse(body)
    const article = await createKBArticle(session.user.id, input)
    return NextResponse.json({ data: article }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create KB article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
