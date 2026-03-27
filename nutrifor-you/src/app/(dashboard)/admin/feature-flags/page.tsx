'use client'

import { useState, useEffect, useCallback } from 'react'

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  isEnabled: boolean
  tiers: string[]
  createdAt: string
}

const ALL_TIERS = ['TRIAL', 'LITE', 'PREMIUM', 'BUSINESS']

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newFlag, setNewFlag] = useState({ key: '', name: '', description: '', tiers: [] as string[] })

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/feature-flags')
      const result = await res.json()
      setFlags(result.data || [])
    } catch (error) {
      console.error('Failed to fetch feature flags:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  const toggleFlag = async (id: string, isEnabled: boolean) => {
    await fetch(`/api/admin/feature-flags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    })
    fetchFlags()
  }

  const createFlag = async () => {
    await fetch('/api/admin/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFlag),
    })
    setShowCreate(false)
    setNewFlag({ key: '', name: '', description: '', tiers: [] })
    fetchFlags()
  }

  const deleteFlag = async (id: string) => {
    if (!confirm('Delete this feature flag?')) return
    await fetch(`/api/admin/feature-flags/${id}`, { method: 'DELETE' })
    fetchFlags()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          + New Flag
        </button>
      </div>

      {showCreate && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="key (e.g. ai-meal-plans)"
              value={newFlag.key}
              onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Name"
              value={newFlag.name}
              onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            placeholder="Description (optional)"
            value={newFlag.description}
            onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Tiers:</span>
            {ALL_TIERS.map((tier) => (
              <label key={tier} className="flex items-center space-x-1 text-sm">
                <input
                  type="checkbox"
                  checked={newFlag.tiers.includes(tier)}
                  onChange={(e) => {
                    const tiers = e.target.checked
                      ? [...newFlag.tiers, tier]
                      : newFlag.tiers.filter((t) => t !== tier)
                    setNewFlag({ ...newFlag, tiers })
                  }}
                />
                <span>{tier}</span>
              </label>
            ))}
          </div>
          <button
            onClick={createFlag}
            disabled={!newFlag.key || !newFlag.name}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y">
        {flags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No feature flags configured.</div>
        ) : (
          flags.map((flag) => (
            <div key={flag.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">{flag.key}</code>
                  <span className="text-sm font-medium text-gray-900">{flag.name}</span>
                </div>
                {flag.description && <p className="text-xs text-gray-500 mt-1">{flag.description}</p>}
                {flag.tiers.length > 0 && (
                  <div className="flex space-x-1 mt-1">
                    {flag.tiers.map((t) => (
                      <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleFlag(flag.id, !flag.isEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    flag.isEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    flag.isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <button onClick={() => deleteFlag(flag.id)} className="text-xs text-red-600 hover:text-red-800">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
