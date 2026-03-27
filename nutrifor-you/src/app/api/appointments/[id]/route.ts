import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAppointmentById, updateAppointment, deleteAppointment } from '@/services/appointment.service'
import { updateAppointmentSchema } from '@/validators/appointment.schema'
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
    const appointment = await getAppointmentById(id, session.user.id)
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    return NextResponse.json({ data: appointment })
  } catch (error) {
    logger.error({ error }, 'Failed to get appointment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const validation = updateAppointmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const appointment = await updateAppointment(id, session.user.id, validation.data)
    return NextResponse.json({ data: appointment })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'Appointment not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('overlaps')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    logger.error({ error }, 'Failed to update appointment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await deleteAppointment(id, session.user.id)
    return NextResponse.json({ message: 'Appointment deleted' })
  } catch (error) {
    if ((error as Error).message === 'Appointment not found') {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete appointment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
