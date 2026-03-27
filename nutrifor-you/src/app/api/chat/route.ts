import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createConversation, listConversations } from '@/services/chat.service'
import { createConversationSchema } from '@/validators/chat.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const result = await listConversations(session.user.id, {
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list conversations')
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
    const validation = createConversationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const conversation = await createConversation(session.user.id, validation.data)
    return NextResponse.json({ data: conversation }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create conversation')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
