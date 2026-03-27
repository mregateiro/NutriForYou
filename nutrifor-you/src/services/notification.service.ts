import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { Prisma } from '@prisma/client'
import type { CreateNotificationInput } from '@/validators/admin.schema'

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })

  logger.info({ notificationId: notification.id, userId: input.userId, type: input.type }, 'Notification created')
  return notification
}

export async function listNotifications(
  userId: string,
  params: { unreadOnly?: boolean; page?: number; perPage?: number }
) {
  const { page = 1, perPage = 20, unreadOnly } = params
  const where: Record<string, unknown> = { userId }

  if (unreadOnly) {
    where.readAt = null
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ])

  return {
    data: notifications,
    unreadCount,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  })
  if (!notification) throw new Error('Notification not found')

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  })
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function deleteNotification(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  })
  if (!notification) throw new Error('Notification not found')

  await prisma.notification.delete({ where: { id } })
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}
