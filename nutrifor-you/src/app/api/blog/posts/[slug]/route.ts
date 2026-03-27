import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBlogPost, updateBlogPost, deleteBlogPost } from '@/services/blog.service'
import { updateBlogPostSchema } from '@/validators/blog.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await getBlogPost(slug)
    return NextResponse.json({ data: post })
  } catch (error) {
    if ((error as Error).message === 'Post not found') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get blog post')
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
    const post = await getBlogPost(slug)
    const body = await req.json()
    const input = updateBlogPostSchema.parse(body)
    const updated = await updateBlogPost(post.id, session.user.id, input)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if ((error as Error).message === 'Post not found') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update blog post')
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
    const post = await getBlogPost(slug)
    await deleteBlogPost(post.id, session.user.id)
    return NextResponse.json({ message: 'Post deleted' })
  } catch (error) {
    if ((error as Error).message === 'Post not found') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete blog post')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
