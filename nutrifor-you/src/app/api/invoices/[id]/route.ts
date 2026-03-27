import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInvoiceById, updateInvoice } from '@/services/payment.service'
import { updateInvoiceSchema } from '@/validators/payment.schema'
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
    const invoice = await getInvoiceById(id)
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    return NextResponse.json({ data: invoice })
  } catch (error) {
    logger.error({ error }, 'Failed to get invoice')
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
    const validation = updateInvoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const invoice = await updateInvoice(id, session.user.id, validation.data)
    return NextResponse.json({ data: invoice })
  } catch (error) {
    if ((error as Error).message === 'Invoice not found') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update invoice')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
