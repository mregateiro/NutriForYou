'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Participant {
  user: { id: string; name: string | null; email: string }
}

interface LastMessage {
  id: string
  content: string
  createdAt: string
  sender: { id: string; name: string | null }
}

interface Conversation {
  id: string
  title: string | null
  isGroup: boolean
  lastMessageAt: string | null
  participants: Participant[]
  messages: LastMessage[]
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat')
      const result = await res.json()
      setConversations(result.data || [])
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatUserId, setNewChatUserId] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateConversation = async () => {
    if (!newChatUserId.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: [newChatUserId.trim()] }),
      })
      if (res.ok) {
        const result = await res.json()
        window.location.href = `/messages/${result.data.id}`
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          + New Conversation
        </button>
      </div>

      {showNewChat && (
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter user ID to start a conversation"
              value={newChatUserId}
              onChange={(e) => setNewChatUserId(e.target.value)}
              aria-label="User ID for new conversation"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleCreateConversation}
              disabled={creating || !newChatUserId.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Start Chat'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No conversations yet.</p>
          <p className="text-sm text-gray-400">Start a conversation with a patient or colleague.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {conversations.map((conv) => {
            const lastMsg = conv.messages[0]
            const otherParticipants = conv.participants
              .map((p) => p.user.name || p.user.email)
            const displayName = conv.title || otherParticipants.join(', ')

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {displayName}
                      </h3>
                      {conv.isGroup && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Group
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        <span className="font-medium">{lastMsg.sender.name || 'User'}:</span>{' '}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                  {lastMsg && (
                    <span className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                      {new Date(lastMsg.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
