import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTicket, listTickets } from '@/services/support.service'
import { createTicketSchema } from '@/validators/support.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const result = await listTickets(session.user.id, {
      status: url.searchParams.get('status') || undefined,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
      isAdmin: session.user.role === 'ADMIN',
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list tickets')
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
    const input = createTicketSchema.parse(body)
    const ticket = await createTicket(session.user.id, input)
    return NextResponse.json({ data: ticket }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create ticket')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
