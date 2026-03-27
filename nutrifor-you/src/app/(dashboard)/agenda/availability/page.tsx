'use client'

import { useState, useEffect } from 'react'

interface AvailabilityRule {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
  slotDuration: number
  isActive: boolean
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export default function AvailabilityPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [newRule, setNewRule] = useState({
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 60,
  })

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/appointments/availability')
      const result = await res.json()
      setRules(result.data || [])
    } catch (err) {
      console.error('Failed to fetch rules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/appointments/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add rule')
      }

      fetchRules()
      setNewRule({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', slotDuration: 60 })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this availability rule?')) return

    try {
      await fetch(`/api/appointments/availability?id=${id}`, { method: 'DELETE' })
      setRules(rules.filter(r => r.id !== id))
    } catch (err) {
      console.error('Failed to delete rule:', err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Availability Rules</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Availability</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700">Day</label>
              <select
                id="dayOfWeek"
                value={newRule.dayOfWeek}
                onChange={(e) => setNewRule({ ...newRule, dayOfWeek: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                {DAYS.map(d => (
                  <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start</label>
              <input
                id="startTime"
                type="time"
                value={newRule.startTime}
                onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End</label>
              <input
                id="endTime"
                type="time"
                value={newRule.endTime}
                onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="slotDuration" className="block text-sm font-medium text-gray-700">Slot (min)</label>
              <select
                id="slotDuration"
                value={newRule.slotDuration}
                onChange={(e) => setNewRule({ ...newRule, slotDuration: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Rule'}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 px-6 pt-6 pb-3">Current Schedule</h2>
        {loading ? (
          <div className="text-center py-6 text-gray-500">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No availability rules defined yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {rule.dayOfWeek.charAt(0) + rule.dayOfWeek.slice(1).toLowerCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rule.startTime} – {rule.endTime}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{rule.slotDuration} min</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
