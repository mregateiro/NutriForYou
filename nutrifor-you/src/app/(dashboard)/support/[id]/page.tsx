'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface Ticket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string }
  assignee: { name: string | null; email: string } | null
  replies: Array<{
    id: string
    message: string
    isStaff: boolean
    createdAt: string
    user: { name: string | null; email: string }
  }>
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/tickets/${id}`)
      const result = await res.json()
      setTicket(result.data)
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await fetch(`/api/support/tickets/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply }),
      })
      setReply('')
      fetchTicket()
    } catch (error) {
      console.error('Failed to send reply:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!ticket) return <div className="text-center py-12 text-red-500">Ticket not found</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-sm text-gray-500 mt-1">
              By {ticket.user.name || ticket.user.email} · {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              ticket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' :
              ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {ticket.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{ticket.priority}</span>
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-4 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Replies */}
      <div className="space-y-4 mb-6">
        {ticket.replies.map((r) => (
          <div key={r.id} className={`rounded-lg p-4 ${r.isStaff ? 'bg-blue-50 border border-blue-100' : 'bg-white shadow'}`}>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-900">{r.user.name || r.user.email}</span>
              {r.isStaff && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">Staff</span>}
              <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {ticket.status !== 'CLOSED' && (
        <form onSubmit={sendReply} className="bg-white shadow rounded-lg p-4">
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Reply'}
          </button>
        </form>
      )}
    </div>
  )
}
