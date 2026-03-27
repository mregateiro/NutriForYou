'use client'

import { useState, useEffect, useCallback } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (showUnreadOnly) params.set('unreadOnly', 'true')
      const res = await fetch(`/api/notifications?${params}`)
      const result = await res.json()
      setNotifications(result.data || [])
      setUnreadCount(result.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [showUnreadOnly])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    fetchNotifications()
  }

  const markAllAsRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    fetchNotifications()
  }

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    fetchNotifications()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-3 py-2 rounded-md text-sm ${
              showUnreadOnly ? 'bg-indigo-100 text-indigo-700' : 'border text-gray-600'
            }`}
          >
            {showUnreadOnly ? 'Show All' : 'Unread Only'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-indigo-600 hover:text-indigo-800 px-3 py-2"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No notifications.</div>
      ) : (
        <div className="bg-white shadow rounded-lg divide-y">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-6 py-4 flex items-start justify-between ${
                !n.readAt ? 'bg-indigo-50/50' : ''
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {!n.readAt && <span className="w-2 h-2 bg-indigo-600 rounded-full" />}
                  <h3 className="text-sm font-semibold text-gray-900">{n.title}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{n.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                {!n.readAt && (
                  <button onClick={() => markAsRead(n.id)} className="text-xs text-indigo-600 hover:text-indigo-800">
                    Mark read
                  </button>
                )}
                <button onClick={() => deleteNotification(n.id)} className="text-xs text-red-600 hover:text-red-800">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
