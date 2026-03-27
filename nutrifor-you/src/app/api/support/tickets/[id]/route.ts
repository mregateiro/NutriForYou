import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTicket, updateTicket } from '@/services/support.service'
import { updateTicketSchema } from '@/validators/support.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const ticket = await getTicket(id, session.user.id)
    return NextResponse.json({ data: ticket })
  } catch (error) {
    if ((error as Error).message === 'Ticket not found') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to get ticket')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const input = updateTicketSchema.parse(body)
    const ticket = await updateTicket(id, session.user.id, input)
    return NextResponse.json({ data: ticket })
  } catch (error) {
    if ((error as Error).message === 'Ticket not found') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update ticket')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
