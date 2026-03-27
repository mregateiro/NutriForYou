import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateUserRole, deactivateUser } from '@/services/admin.service'
import { updateUserRoleSchema } from '@/validators/admin.schema'
import { logger } from '@/lib/logger'

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
    const validation = updateUserRoleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const user = await updateUserRole(id, validation.data.role, session.user.id)
    return NextResponse.json({ data: user })
  } catch (error) {
    if ((error as Error).message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update user role')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    await deactivateUser(id, session.user.id)
    return NextResponse.json({ message: 'User deactivated' })
  } catch (error) {
    if ((error as Error).message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to deactivate user')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
