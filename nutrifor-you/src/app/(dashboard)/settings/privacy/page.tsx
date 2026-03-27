'use client'

import { useState, useEffect } from 'react'

interface Consent {
  id: string
  purpose: string
  granted: boolean
  version: string
  grantedAt: string
  revokedAt: string | null
}

const PURPOSE_LABELS: Record<string, { title: string; description: string }> = {
  DATA_PROCESSING: {
    title: 'Data Processing',
    description: 'Allow us to process your personal data to provide our services. This is required for platform functionality.',
  },
  MARKETING: {
    title: 'Marketing Communications',
    description: 'Receive product updates, tips, and promotional content via email.',
  },
  THIRD_PARTY_SHARING: {
    title: 'Third-Party Data Sharing',
    description: 'Allow sharing anonymized data with analytics partners to improve our services.',
  },
  HEALTH_DATA_PROCESSING: {
    title: 'Health Data Processing',
    description: 'Allow processing of health-related data (consultations, meal plans, body measurements) to provide clinical services.',
  },
}

export default function PrivacyPage() {
  const [consents, setConsents] = useState<Consent[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [erasureEmail, setErasureEmail] = useState('')
  const [erasureReason, setErasureReason] = useState('')
  const [showErasure, setShowErasure] = useState(false)

  useEffect(() => {
    fetchConsents()
  }, [])

  const fetchConsents = async () => {
    try {
      const res = await fetch('/api/consent')
      const result = await res.json()
      setConsents(result.data || [])
    } catch (error) {
      console.error('Failed to fetch consents:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleConsent = async (purpose: string, granted: boolean) => {
    setUpdating(purpose)
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, granted, version: '1.0' }),
      })

      if (res.ok) {
        fetchConsents()
      }
    } catch (error) {
      console.error('Failed to update consent:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/consent/export')
      const result = await res.json()

      // Download as JSON
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutriforyou-data-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleErasure = async () => {
    if (!confirm('⚠️ This action is IRREVERSIBLE. All your data will be permanently deleted. Are you absolutely sure?')) return

    try {
      const res = await fetch('/api/consent/erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: erasureEmail, reason: erasureReason }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to process erasure request')
        return
      }

      alert('Your data has been erased. You will be signed out.')
      window.location.href = '/api/auth/signout'
    } catch (error) {
      console.error('Failed to process erasure:', error)
    }
  }

  const isConsentGranted = (purpose: string) => {
    const consent = consents.find(c => c.purpose === purpose && !c.revokedAt)
    return consent?.granted ?? false
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading privacy settings...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Data</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage your data privacy preferences in compliance with GDPR and LGPD regulations.
      </p>

      {/* Consent Management */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Consent Preferences</h2>
        <div className="space-y-4">
          {Object.entries(PURPOSE_LABELS).map(([purpose, info]) => (
            <div key={purpose} className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">{info.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
              </div>
              <button
                onClick={() => toggleConsent(purpose, !isConsentGranted(purpose))}
                disabled={updating === purpose}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isConsentGranted(purpose) ? 'bg-indigo-600' : 'bg-gray-200'
                } ${updating === purpose ? 'opacity-50' : ''}`}
                role="switch"
                aria-checked={isConsentGranted(purpose)}
                aria-label={`Toggle ${info.title}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isConsentGranted(purpose) ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Export (GDPR Art. 15) */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Export</h2>
        <p className="text-sm text-gray-500 mb-4">
          Download a copy of all your personal data (GDPR Article 15 — Right of Access).
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export My Data (JSON)'}
        </button>
      </div>

      {/* Data Erasure (GDPR Art. 17) */}
      <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Delete My Account</h2>
        <p className="text-sm text-gray-500 mb-4">
          Request permanent deletion of your account and all associated data (GDPR Article 17 — Right to Erasure).
          This action is <strong>irreversible</strong>.
        </p>

        {!showErasure ? (
          <button
            onClick={() => setShowErasure(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
          >
            Request Account Deletion
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="erasureEmail" className="block text-sm font-medium text-gray-700">
                Confirm your email to proceed
              </label>
              <input
                id="erasureEmail"
                type="email"
                value={erasureEmail}
                onChange={(e) => setErasureEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label htmlFor="erasureReason" className="block text-sm font-medium text-gray-700">
                Reason (optional)
              </label>
              <textarea
                id="erasureReason"
                value={erasureReason}
                onChange={(e) => setErasureReason(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleErasure}
                disabled={!erasureEmail}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                Permanently Delete My Account
              </button>
              <button
                onClick={() => setShowErasure(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
