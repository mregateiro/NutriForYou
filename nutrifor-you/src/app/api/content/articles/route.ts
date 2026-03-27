import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listContentArticles, createContentArticle } from '@/services/content.service'
import { createContentArticleSchema } from '@/validators/content.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const result = await listContentArticles({
      category: url.searchParams.get('category') || undefined,
      contentType: url.searchParams.get('contentType') || undefined,
      isPublished: url.searchParams.get('published') === 'false' ? false : true,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list content articles')
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
    const input = createContentArticleSchema.parse(body)
    const article = await createContentArticle(session.user.id, input)
    return NextResponse.json({ data: article }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create content article')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
