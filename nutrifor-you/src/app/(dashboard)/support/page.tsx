'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  category: string | null
  createdAt: string
  user: { name: string | null; email: string }
  _count: { replies: number }
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  WAITING_ON_CUSTOMER: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/support/tickets?${params}`)
      const result = await res.json()
      setTickets(result.data || [])
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <div className="flex space-x-2">
          <Link href="/support/kb" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm">
            Knowledge Base
          </Link>
          <Link href="/support/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
            + New Ticket
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No support tickets found.</div>
      ) : (
        <div className="bg-white shadow rounded-lg divide-y">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/support/${ticket.id}`} className="block px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${PRIORITY_COLORS[ticket.priority]}`}>●</span>
                    <h3 className="text-sm font-semibold text-gray-900">{ticket.subject}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    By {ticket.user.name || ticket.user.email} · {new Date(ticket.createdAt).toLocaleDateString()} · {ticket._count.replies} replies
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
