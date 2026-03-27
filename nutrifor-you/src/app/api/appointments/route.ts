import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createAppointment, listAppointments } from '@/services/appointment.service'
import { createAppointmentSchema } from '@/validators/appointment.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const result = await listAppointments(session.user.id, {
      patientId: url.searchParams.get('patientId') || undefined,
      status: url.searchParams.get('status') as 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW' | undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 50,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list appointments')
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
    const validation = createAppointmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const appointment = await createAppointment(session.user.id, validation.data)
    return NextResponse.json({ data: appointment }, { status: 201 })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'Patient not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('overlaps')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    logger.error({ error }, 'Failed to create appointment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
