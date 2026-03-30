'use client'

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react'

interface IntegrationItem {
  id: string
  provider: string
  status: string
  lastSyncAt: string | null
  createdAt: string
}

interface ConfigField {
  name: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder: string
}

const PROVIDER_FIELDS: Record<string, ConfigField[]> = {
  GOOGLE_CALENDAR: [
    { name: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'Your Google OAuth Client ID' },
    { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: 'Your Google OAuth Client Secret' },
  ],
  WHATSAPP: [
    { name: 'apiToken', label: 'API Token', type: 'password', required: true, placeholder: 'WhatsApp Business API Token' },
    { name: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true, placeholder: 'WhatsApp Phone Number ID' },
  ],
  STRIPE: [
    { name: 'apiKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
  ],
  PAGSEGURO: [
    { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'your-email@example.com' },
    { name: 'token', label: 'Token', type: 'password', required: true, placeholder: 'Your PagSeguro token' },
  ],
  ZOOM: [
    { name: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'Your Zoom OAuth Client ID' },
    { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: 'Your Zoom OAuth Client Secret' },
  ],
  WEBHOOK: [
    { name: 'url', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://example.com/webhook' },
    { name: 'secret', label: 'Secret (optional)', type: 'password', required: false, placeholder: 'Signing secret for verification' },
  ],
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
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

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

  const openConnectModal = (providerKey: string) => {
    setConnectingProvider(providerKey)
    setFormValues({})
    setFormError(null)
    setSubmitting(false)
    dialogRef.current?.showModal()
  }

  const closeModal = () => {
    dialogRef.current?.close()
    setConnectingProvider(null)
    setFormValues({})
    setFormError(null)
    setSubmitting(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!connectingProvider) return

    const fields = PROVIDER_FIELDS[connectingProvider] || []
    for (const field of fields) {
      const value = formValues[field.name]?.trim() ?? ''
      if (field.required && !value) {
        setFormError(`${field.label} is required.`)
        return
      }
      if (field.type === 'url' && value) {
        try {
          new URL(value)
        } catch {
          setFormError(`${field.label} must be a valid URL.`)
          return
        }
      }
    }

    // Strip empty optional values so they aren't sent as empty strings
    const config: Record<string, string> = {}
    for (const field of fields) {
      const value = formValues[field.name]?.trim() ?? ''
      if (value) {
        config[field.name] = value
      }
    }

    setFormError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: connectingProvider, config }),
      })

      if (!res.ok) {
        const result = await res.json()
        setFormError(result.error || 'Failed to connect. Please try again.')
        setSubmitting(false)
        return
      }

      closeModal()
      fetchIntegrations()
    } catch {
      setFormError('Network error. Please try again.')
      setSubmitting(false)
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

  const activeProvider = PROVIDERS.find((p) => p.key === connectingProvider)
  const activeFields = connectingProvider ? PROVIDER_FIELDS[connectingProvider] || [] : []

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
                  onClick={() => openConnectModal(p.key)}
                  className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  Connect
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Configuration Modal */}
      <dialog
        ref={dialogRef}
        className="rounded-lg shadow-xl p-0 w-full max-w-md backdrop:bg-black/50"
        onClose={closeModal}
        aria-labelledby="connect-modal-title"
      >
        {activeProvider && (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="connect-modal-title" className="text-lg font-semibold text-gray-900">
                Connect {activeProvider.name}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Enter your credentials to connect {activeProvider.name}.
            </p>

            {formError && (
              <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              {activeFields.map((field) => (
                <div key={field.name}>
                  <label htmlFor={`field-${field.name}`} className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
                  </label>
                  <input
                    id={`field-${field.name}`}
                    type={field.type}
                    required={field.required}
                    aria-required={field.required}
                    placeholder={field.placeholder}
                    value={formValues[field.name] || ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  )
}
