import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPaymentById, updatePayment, deletePayment } from '@/services/payment.service'
import { updatePaymentSchema } from '@/validators/payment.schema'
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
    const payment = await getPaymentById(id, session.user.id)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    return NextResponse.json({ data: payment })
  } catch (error) {
    logger.error({ error }, 'Failed to get payment')
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
    const validation = updatePaymentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const payment = await updatePayment(id, session.user.id, validation.data)
    return NextResponse.json({ data: payment })
  } catch (error) {
    if ((error as Error).message === 'Payment not found') {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update payment')
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
    await deletePayment(id, session.user.id)
    return NextResponse.json({ message: 'Payment deleted' })
  } catch (error) {
    if ((error as Error).message === 'Payment not found') {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete payment')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
