import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listNotifications, markAllNotificationsRead } from '@/services/notification.service'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const result = await listNotifications(session.user.id, {
      unreadOnly: url.searchParams.get('unreadOnly') === 'true',
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list notifications')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await markAllNotificationsRead(session.user.id)
    return NextResponse.json({ message: 'All notifications marked as read' })
  } catch (error) {
    logger.error({ error }, 'Failed to mark all notifications as read')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
