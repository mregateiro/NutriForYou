import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendMessage, listMessages, editMessage, deleteMessage } from '@/services/chat.service'
import { sendMessageSchema, updateMessageSchema } from '@/validators/chat.schema'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { conversationId } = await params
    const url = new URL(req.url)
    const result = await listMessages(conversationId, session.user.id, {
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 50,
    })

    return NextResponse.json(result)
  } catch (error) {
    if ((error as Error).message === 'Not a participant of this conversation') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    logger.error({ error }, 'Failed to list messages')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { conversationId } = await params
    const body = await req.json()
    const validation = sendMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const message = await sendMessage(conversationId, session.user.id, validation.data)
    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Not a participant of this conversation') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    logger.error({ error }, 'Failed to send message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { messageId, ...rest } = body
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }
    const validation = updateMessageSchema.safeParse(rest)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const message = await editMessage(messageId, session.user.id, validation.data.content)
    return NextResponse.json({ data: message })
  } catch (error) {
    if ((error as Error).message === 'Message not found') {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to edit message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const messageId = url.searchParams.get('messageId')
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }

    await deleteMessage(messageId, session.user.id)
    return NextResponse.json({ message: 'Message deleted' })
  } catch (error) {
    if ((error as Error).message === 'Message not found') {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
