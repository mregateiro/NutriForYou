import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markNotificationRead, deleteNotification } from '@/services/notification.service'
import { logger } from '@/lib/logger'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const notification = await markNotificationRead(id, session.user.id)
    return NextResponse.json({ data: notification })
  } catch (error) {
    if ((error as Error).message === 'Notification not found') {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to mark notification as read')
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
    await deleteNotification(id, session.user.id)
    return NextResponse.json({ message: 'Notification deleted' })
  } catch (error) {
    if ((error as Error).message === 'Notification not found') {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete notification')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
