import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildNotification } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// createNotification
// ---------------------------------------------------------------------------
describe('createNotification', () => {
  it('creates notification with correct data', async () => {
    const notification = buildNotification({ userId: 'user-1', type: 'SYSTEM', title: 'Hello', message: 'World' })
    prisma.notification.create.mockResolvedValue(notification)

    const { createNotification } = await import('@/services/notification.service')
    const result = await createNotification({
      userId: 'user-1',
      type: 'SYSTEM',
      title: 'Hello',
      message: 'World',
    } as never)

    expect(result).toEqual(notification)
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'Hello',
        message: 'World',
        data: undefined,
      },
    })
  })
})

// ---------------------------------------------------------------------------
// listNotifications
// ---------------------------------------------------------------------------
describe('listNotifications', () => {
  it('returns paginated notifications with unreadCount', async () => {
    const notifications = [buildNotification(), buildNotification()]
    prisma.notification.findMany.mockResolvedValue(notifications)
    prisma.notification.count.mockResolvedValueOnce(2) // total
    prisma.notification.count.mockResolvedValueOnce(1) // unreadCount

    const { listNotifications } = await import('@/services/notification.service')
    const result = await listNotifications('user-1', { page: 1, perPage: 20 })

    expect(result).toEqual({
      data: notifications,
      unreadCount: 1,
      pagination: { page: 1, perPage: 20, total: 2, totalPages: 1 },
    })
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      }),
    )
  })

  it('applies unreadOnly filter (where.readAt = null)', async () => {
    prisma.notification.findMany.mockResolvedValue([])
    prisma.notification.count.mockResolvedValueOnce(0)
    prisma.notification.count.mockResolvedValueOnce(0)

    const { listNotifications } = await import('@/services/notification.service')
    await listNotifications('user-1', { unreadOnly: true })

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', readAt: null },
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// markNotificationRead
// ---------------------------------------------------------------------------
describe('markNotificationRead', () => {
  it('marks notification as read (updates readAt)', async () => {
    const notification = buildNotification({ id: 'n-1', userId: 'user-1' })
    const updated = { ...notification, readAt: new Date() }
    prisma.notification.findFirst.mockResolvedValue(notification)
    prisma.notification.update.mockResolvedValue(updated)

    const { markNotificationRead } = await import('@/services/notification.service')
    const result = await markNotificationRead('n-1', 'user-1')

    expect(result).toEqual(updated)
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'n-1', userId: 'user-1' },
    })
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n-1' },
      data: { readAt: expect.any(Date) },
    })
  })

  it('throws when notification not found', async () => {
    prisma.notification.findFirst.mockResolvedValue(null)

    const { markNotificationRead } = await import('@/services/notification.service')

    await expect(markNotificationRead('nonexistent', 'user-1')).rejects.toThrow(
      'Notification not found',
    )
  })
})

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------
describe('markAllNotificationsRead', () => {
  it('updates all unread notifications', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 })

    const { markAllNotificationsRead } = await import('@/services/notification.service')
    await markAllNotificationsRead('user-1')

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })
})

// ---------------------------------------------------------------------------
// deleteNotification
// ---------------------------------------------------------------------------
describe('deleteNotification', () => {
  it('deletes notification', async () => {
    const notification = buildNotification({ id: 'n-1', userId: 'user-1' })
    prisma.notification.findFirst.mockResolvedValue(notification)
    prisma.notification.delete.mockResolvedValue(notification)

    const { deleteNotification } = await import('@/services/notification.service')
    await deleteNotification('n-1', 'user-1')

    expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'n-1' } })
  })

  it('throws when notification not found', async () => {
    prisma.notification.findFirst.mockResolvedValue(null)

    const { deleteNotification } = await import('@/services/notification.service')

    await expect(deleteNotification('nonexistent', 'user-1')).rejects.toThrow(
      'Notification not found',
    )
  })
})

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------
describe('getUnreadCount', () => {
  it('returns count of unread notifications', async () => {
    prisma.notification.count.mockResolvedValue(5)

    const { getUnreadCount } = await import('@/services/notification.service')
    const result = await getUnreadCount('user-1')

    expect(result).toBe(5)
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    })
  })
})
