'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Sender {
  id: string
  name: string | null
  email: string
}

interface Message {
  id: string
  content: string
  type: string
  isEdited: boolean
  createdAt: string
  sender: Sender
}

interface Participant {
  user: Sender
  lastReadAt: string | null
}

interface Conversation {
  id: string
  title: string | null
  isGroup: boolean
  participants: Participant[]
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${conversationId}`)
      const result = await res.json()
      setConversation(result.data)
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
    }
  }, [conversationId])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`)
      const result = await res.json()
      setMessages(result.data || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    fetchConversation()
    fetchMessages()
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchConversation, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      if (res.ok) {
        const result = await res.json()
        setMessages((prev) => [...prev, result.data])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      await fetch(`/api/chat/${conversationId}/messages?messageId=${messageId}`, {
        method: 'DELETE',
      })
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: '[Message deleted]', isEdited: false } : m
        )
      )
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const participantNames = conversation?.participants
    .map((p) => p.user.name || p.user.email)
    .join(', ')

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center space-x-4">
          <Link href="/messages" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {conversation?.title || participantNames || 'Conversation'}
            </h1>
            <p className="text-xs text-gray-500">
              {conversation?.participants.length || 0} participants
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="group flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-indigo-700">
                  {(msg.sender.name || msg.sender.email)[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {msg.sender.name || msg.sender.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.isEdited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-0.5 break-words">{msg.content}</p>
              </div>
              <button
                onClick={() => handleDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-opacity"
                title="Delete message"
              >
                ✕
              </button>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="pt-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
