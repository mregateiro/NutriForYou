import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getConsultationById, updateConsultation, deleteConsultation } from '@/services/consultation.service'
import { updateConsultationSchema } from '@/validators/consultation.schema'
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
    const consultation = await getConsultationById(id, session.user.id)
    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }
    return NextResponse.json({ data: consultation })
  } catch (error) {
    logger.error({ error }, 'Failed to get consultation')
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
    const validation = updateConsultationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const consultation = await updateConsultation(id, session.user.id, validation.data)
    return NextResponse.json({ data: consultation })
  } catch (error) {
    if ((error as Error).message === 'Consultation not found') {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update consultation')
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
    await deleteConsultation(id, session.user.id)
    return NextResponse.json({ message: 'Consultation deleted' })
  } catch (error) {
    if ((error as Error).message === 'Consultation not found') {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete consultation')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
