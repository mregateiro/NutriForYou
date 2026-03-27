import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateEmailTemplate, deleteEmailTemplate } from '@/services/marketing.service'
import { updateEmailTemplateSchema } from '@/validators/marketing.schema'
import { logger } from '@/lib/logger'

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
    const input = updateEmailTemplateSchema.parse(body)
    const template = await updateEmailTemplate(id, input)
    return NextResponse.json({ data: template })
  } catch (error) {
    if ((error as Error).message === 'Template not found') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update template')
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
    await deleteEmailTemplate(id)
    return NextResponse.json({ message: 'Template deleted' })
  } catch (error) {
    logger.error({ error }, 'Failed to delete template')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
