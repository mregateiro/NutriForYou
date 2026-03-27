'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PatientOption {
  id: string
  firstName: string
  lastName: string
  allergies: string[]
  dietaryRestrictions: string[]
}

export default function GenerateMealPlanPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    patientId: '',
    title: '',
    preferences: '',
    restrictions: '',
    calorieTarget: '',
    proteinTarget: '',
    numberOfDays: '7',
    mealsPerDay: '5',
  })

  useEffect(() => {
    fetch('/api/patients?perPage=100')
      .then(r => r.json())
      .then(res => setPatients(res.data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = {
        ...formData,
        calorieTarget: formData.calorieTarget ? Number(formData.calorieTarget) : undefined,
        proteinTarget: formData.proteinTarget ? Number(formData.proteinTarget) : undefined,
        numberOfDays: Number(formData.numberOfDays),
        mealsPerDay: Number(formData.mealsPerDay),
      }

      const res = await fetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const result = await res.json()
        setError(result.error || 'Failed to generate meal plan')
        setLoading(false)
        return
      }

      const result = await res.json()
      router.push(`/meal-plans/${result.data.id}`)
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🤖 Generate Meal Plan with AI</h1>
        <Link href="/meal-plans" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Patient *</label>
          <select
            value={formData.patientId}
            onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">Select patient...</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Title *</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
            placeholder="e.g., Weight Loss Plan - Week 1"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Days</label>
            <select value={formData.numberOfDays} onChange={(e) => setFormData(prev => ({ ...prev, numberOfDays: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
              {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Meals per Day</label>
            <select value={formData.mealsPerDay} onChange={(e) => setFormData(prev => ({ ...prev, mealsPerDay: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
              {[3,4,5,6].map(n => <option key={n} value={n}>{n} meals</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Calorie Target (kcal/day)</label>
            <input type="number" value={formData.calorieTarget} onChange={(e) => setFormData(prev => ({ ...prev, calorieTarget: e.target.value }))} placeholder="e.g., 2000" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Protein Target (g/day)</label>
            <input type="number" value={formData.proteinTarget} onChange={(e) => setFormData(prev => ({ ...prev, proteinTarget: e.target.value }))} placeholder="e.g., 120" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Food Preferences</label>
          <textarea
            value={formData.preferences}
            onChange={(e) => setFormData(prev => ({ ...prev, preferences: e.target.value }))}
            rows={2}
            placeholder="e.g., Prefers Mediterranean cuisine, likes salmon..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Additional Restrictions</label>
          <textarea
            value={formData.restrictions}
            onChange={(e) => setFormData(prev => ({ ...prev, restrictions: e.target.value }))}
            rows={2}
            placeholder="e.g., No shellfish, low sodium..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link href="/meal-plans" className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
            {loading ? '🤖 Generating...' : '🤖 Generate Meal Plan'}
          </button>
        </div>
      </form>
    </div>
  )
}
