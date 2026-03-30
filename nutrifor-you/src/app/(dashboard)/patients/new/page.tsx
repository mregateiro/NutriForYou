'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPatientSchema, type CreatePatientInput } from '@/validators/patient.schema'

export default function NewPatientPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data: CreatePatientInput = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: (formData.get('email') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      dateOfBirth: (formData.get('dateOfBirth') as string) || undefined,
      gender: (formData.get('gender') as string) || undefined,
      goals: (formData.get('goals') as string) || undefined,
      medicalHistory: (formData.get('medicalHistory') as string) || undefined,
      height: formData.get('height') ? Number(formData.get('height')) : undefined,
      weight: formData.get('weight') ? Number(formData.get('weight')) : undefined,
      targetWeight: formData.get('targetWeight') ? Number(formData.get('targetWeight')) : undefined,
      allergies: [],
      dietaryRestrictions: [],
      currentMedications: [],
      country: 'BR',
    }

    const validation = createPatientSchema.safeParse(data)
    if (!validation.success) {
      setError(validation.error.errors[0].message)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const result = await res.json()
        setError(result.error || 'Failed to create patient')
        setLoading(false)
        return
      }

      const result = await res.json()
      router.push(`/patients/${result.data.id}`)
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Register New Patient</h1>
        <Link href="/patients" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to patients
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {error && (
          <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name <span aria-hidden="true">*</span></label>
            <input id="firstName" name="firstName" required aria-required="true" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name <span aria-hidden="true">*</span></label>
            <input id="lastName" name="lastName" required aria-required="true" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
            <input id="phone" name="phone" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
            <select id="gender" name="gender" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <h2 className="text-lg font-medium text-gray-900 border-b pb-2 mt-8">Clinical Data</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (cm)</label>
            <input id="height" name="height" type="number" step="0.1" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Weight (kg)</label>
            <input id="weight" name="weight" type="number" step="0.1" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="targetWeight" className="block text-sm font-medium text-gray-700">Target Weight (kg)</label>
            <input id="targetWeight" name="targetWeight" type="number" step="0.1" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
        </div>

        <div>
          <label htmlFor="goals" className="block text-sm font-medium text-gray-700">Goals</label>
          <textarea id="goals" name="goals" rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700">Medical History</label>
          <textarea id="medicalHistory" name="medicalHistory" rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link href="/patients" className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
