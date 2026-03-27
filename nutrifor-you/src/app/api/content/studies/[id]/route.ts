import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateStudyReference, deleteStudyReference } from '@/services/content.service'
import { updateStudyReferenceSchema } from '@/validators/content.schema'
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
    const input = updateStudyReferenceSchema.parse(body)
    const study = await updateStudyReference(id, input)
    return NextResponse.json({ data: study })
  } catch (error) {
    if ((error as Error).message === 'Study not found') {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update study reference')
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
    await deleteStudyReference(id)
    return NextResponse.json({ message: 'Study reference deleted' })
  } catch (error) {
    logger.error({ error }, 'Failed to delete study reference')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
