'use client'

import { useState, useEffect, useCallback } from 'react'

interface Segment {
  id: string
  name: string
  filters: Record<string, unknown>
  count: number
  createdAt: string
}

export default function ContactSegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newSegment, setNewSegment] = useState({
    name: '',
    roles: [] as string[],
    hasActiveSubscription: false,
  })

  const fetchSegments = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/segments')
      const result = await res.json()
      setSegments(result.data || [])
    } catch (error) {
      console.error('Failed to fetch segments:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSegments() }, [fetchSegments])

  const createSegment = async () => {
    await fetch('/api/marketing/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newSegment.name,
        filters: {
          roles: newSegment.roles.length > 0 ? newSegment.roles : undefined,
          hasActiveSubscription: newSegment.hasActiveSubscription || undefined,
        },
      }),
    })
    setShowCreate(false)
    setNewSegment({ name: '', roles: [], hasActiveSubscription: false })
    fetchSegments()
  }

  const deleteSegment = async (id: string) => {
    if (!confirm('Delete this segment?')) return
    await fetch(`/api/marketing/segments/${id}`, { method: 'DELETE' })
    fetchSegments()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contact Segments</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
          + New Segment
        </button>
      </div>

      {showCreate && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-3">
          <input placeholder="Segment name" value={newSegment.name}
            onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Roles:</span>
            {['ADMIN', 'NUTRITIONIST', 'PATIENT'].map((role) => (
              <label key={role} className="flex items-center space-x-1 text-sm">
                <input type="checkbox" checked={newSegment.roles.includes(role)}
                  onChange={(e) => {
                    const roles = e.target.checked
                      ? [...newSegment.roles, role]
                      : newSegment.roles.filter((r) => r !== role)
                    setNewSegment({ ...newSegment, roles })
                  }} />
                <span>{role}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={newSegment.hasActiveSubscription}
              onChange={(e) => setNewSegment({ ...newSegment, hasActiveSubscription: e.target.checked })} />
            <span>Active subscription only</span>
          </label>
          <button onClick={createSegment} disabled={!newSegment.name}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            Create Segment
          </button>
        </div>
      )}

      {segments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No contact segments created yet.</div>
      ) : (
        <div className="space-y-4">
          {segments.map((segment) => (
            <div key={segment.id} className="bg-white shadow rounded-lg px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                  <span>{segment.count} contacts</span>
                  <span>·</span>
                  <span>Created {new Date(segment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => deleteSegment(segment.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
