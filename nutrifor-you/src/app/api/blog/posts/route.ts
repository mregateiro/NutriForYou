import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listBlogPosts, createBlogPost } from '@/services/blog.service'
import { createBlogPostSchema } from '@/validators/blog.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const result = await listBlogPosts({
      status: url.searchParams.get('status') || undefined,
      category: url.searchParams.get('category') || undefined,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list blog posts')
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
    const input = createBlogPostSchema.parse(body)
    const post = await createBlogPost(session.user.id, input)
    return NextResponse.json({ data: post }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create blog post')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
