'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  subject: string | null
  sentCount: number
  openCount: number
  clickCount: number
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  author: { name: string | null }
  segment: { name: string; count: number } | null
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SENDING: 'bg-yellow-100 text-yellow-700',
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

const TYPE_ICONS: Record<string, string> = {
  EMAIL: '📧',
  SMS: '📱',
  IN_APP: '🔔',
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/marketing/campaigns?${params}`)
      const result = await res.json()
      setCampaigns(result.data || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    await fetch(`/api/marketing/campaigns/${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing & CRM</h1>
        <div className="flex space-x-2">
          <Link href="/marketing/templates" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm">
            Templates
          </Link>
          <Link href="/marketing/segments" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm">
            Segments
          </Link>
          <Link href="/marketing/campaigns/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
            + New Campaign
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'DRAFT', 'SCHEDULED', 'SENT'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No campaigns yet. Create your first campaign.</div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span>{TYPE_ICONS[campaign.type] || '📧'}</span>
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[campaign.status]}`}>
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.subject && <p className="text-sm text-gray-500 mt-1">Subject: {campaign.subject}</p>}
                  {campaign.segment && (
                    <p className="text-xs text-gray-400 mt-1">Segment: {campaign.segment.name} ({campaign.segment.count} contacts)</p>
                  )}
                </div>
                <div className="flex items-center space-x-6 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{campaign.sentCount}</p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{campaign.openCount}</p>
                    <p className="text-xs text-gray-500">Opens</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{campaign.clickCount}</p>
                    <p className="text-xs text-gray-500">Clicks</p>
                  </div>
                  <button onClick={() => deleteCampaign(campaign.id)}
                    className="text-xs text-red-600 hover:text-red-800 ml-4">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
