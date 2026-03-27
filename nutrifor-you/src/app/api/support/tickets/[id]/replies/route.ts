import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { replyToTicket } from '@/services/support.service'
import { createReplySchema } from '@/validators/support.schema'
import { logger } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const input = createReplySchema.parse(body)
    const reply = await replyToTicket(id, session.user.id, input)
    return NextResponse.json({ data: reply }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === 'Ticket not found') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to reply to ticket')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
