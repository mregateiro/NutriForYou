'use client'

import { useState, useEffect, useCallback } from 'react'

interface IntegrationItem {
  id: string
  provider: string
  status: string
  lastSyncAt: string | null
  createdAt: string
}

const PROVIDERS = [
  { key: 'GOOGLE_CALENDAR', name: 'Google Calendar', icon: '📅', desc: 'Sync appointments with Google Calendar' },
  { key: 'WHATSAPP', name: 'WhatsApp', icon: '💬', desc: 'Send messages to patients via WhatsApp' },
  { key: 'STRIPE', name: 'Stripe', icon: '💳', desc: 'Process payments with Stripe' },
  { key: 'PAGSEGURO', name: 'PagSeguro', icon: '🏦', desc: 'Accept payments via PagSeguro' },
  { key: 'ZOOM', name: 'Zoom', icon: '🎥', desc: 'Video consultations with Zoom' },
  { key: 'WEBHOOK', name: 'Webhook', icon: '🔗', desc: 'Custom webhook integrations' },
]

const STATUS_COLORS: Record<string, string> = {
  CONNECTED: 'bg-green-100 text-green-700',
  DISCONNECTED: 'bg-gray-100 text-gray-700',
  ERROR: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations')
      const result = await res.json()
      setIntegrations(result.data || [])
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchIntegrations() }, [fetchIntegrations])

  const connect = async (provider: string) => {
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      fetchIntegrations()
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }

  const disconnect = async (id: string) => {
    if (!confirm('Disconnect this integration?')) return
    try {
      await fetch(`/api/integrations/${id}`, { method: 'DELETE' })
      fetchIntegrations()
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const getConnected = (provider: string) => integrations.find((i) => i.provider === provider)

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((p) => {
          const connected = getConnected(p.key)
          return (
            <div key={p.key} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                </div>
              </div>

              {connected ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[connected.status]}`}>
                      {connected.status}
                    </span>
                    {connected.lastSyncAt && (
                      <span className="text-xs text-gray-400">
                        Last sync: {new Date(connected.lastSyncAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => disconnect(connected.id)}
                    className="w-full border border-red-300 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => connect(p.key)}
                  className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  Connect
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
