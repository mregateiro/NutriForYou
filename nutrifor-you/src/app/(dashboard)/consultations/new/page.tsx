'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PatientSearch from '@/components/patient-search'

interface PatientOption {
  id: string
  firstName: string
  lastName: string
}

interface Template {
  id: string
  name: string
  content: string
}

function NewConsultationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patientId')

  const [preselectedPatient, setPreselectedPatient] = useState<PatientOption | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    patientId: preselectedPatientId || '',
    title: '',
    chiefComplaint: '',
    notes: '',
    assessment: '',
    plan: '',
    privateNotes: '',
    weight: '',
    height: '',
    duration: '',
    status: 'COMPLETED',
  })

  useEffect(() => {
    // Load templates
    fetch('/api/consultations/templates')
      .then(r => r.json())
      .then(res => setTemplates(res.data || []))

    // If there's a preselected patient, fetch their info
    if (preselectedPatientId) {
      fetch(`/api/patients/${preselectedPatientId}`)
        .then(r => r.json())
        .then(res => {
          if (res.data) {
            setPreselectedPatient({
              id: res.data.id,
              firstName: res.data.firstName,
              lastName: res.data.lastName,
            })
          }
        })
        .catch(() => {})
    }
  }, [preselectedPatientId])

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData(prev => ({ ...prev, notes: template.content }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = {
        ...formData,
        weight: formData.weight ? Number(formData.weight) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        duration: formData.duration ? Number(formData.duration) : undefined,
      }

      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const result = await res.json()
        setError(result.error || 'Failed to create consultation')
        setLoading(false)
        return
      }

      const result = await res.json()
      router.push(`/consultations/${result.data.id}`)
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Consultation</h1>
        <Link href="/consultations" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to consultations
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patientId" className="block text-sm font-medium text-gray-700">Patient *</label>
            <PatientSearch
              id="patientId"
              value={formData.patientId}
              onChange={(patientId) => setFormData(prev => ({ ...prev, patientId }))}
              required
              initialPatient={preselectedPatient}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Template</label>
            <select
              onChange={(e) => applyTemplate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">No template</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Chief Complaint</label>
          <textarea
            value={formData.chiefComplaint}
            onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Measurements</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
            <input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
            <input type="number" step="0.1" value={formData.height} onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
            <input type="number" value={formData.duration} onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
        </div>

        <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Notes</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Consultation Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={6}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Assessment</label>
          <textarea
            value={formData.assessment}
            onChange={(e) => setFormData(prev => ({ ...prev, assessment: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Plan</label>
          <textarea
            value={formData.plan}
            onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Private Notes (not visible to patient)</label>
          <textarea
            value={formData.privateNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, privateNotes: e.target.value }))}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link href="/consultations" className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Consultation'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewConsultationPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <NewConsultationForm />
    </Suspense>
  )
}
