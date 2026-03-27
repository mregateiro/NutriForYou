'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface PatientDetail {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  gender: string | null
  goals: string | null
  medicalHistory: string | null
  height: number | null
  weight: number | null
  targetWeight: number | null
  activityLevel: string | null
  allergies: string[]
  dietaryRestrictions: string[]
  currentMedications: string[]
  notes: string | null
  createdAt: string
  _count: {
    consultations: number
    mealPlans: number
    documents: number
    appointments: number
  }
}

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${params.id}`)
        if (!res.ok) {
          router.push('/patients')
          return
        }
        const result = await res.json()
        setPatient(result.data)
      } catch {
        router.push('/patients')
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [params.id, router])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!patient) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/patients" className="text-sm text-gray-500 hover:text-gray-700">← Back to patients</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {patient.firstName} {patient.lastName}
          </h1>
        </div>
        <div className="flex space-x-3">
          <Link href={`/patients/${patient.id}/timeline`} className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50">
            Timeline
          </Link>
          <Link href={`/patients/${patient.id}/documents`} className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50">
            Documents
          </Link>
          <Link href={`/consultations/new?patientId=${patient.id}`} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
            New Consultation
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Personal Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium">{patient.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-medium">{patient.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Date of Birth</dt>
                <dd className="text-sm font-medium">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Gender</dt>
                <dd className="text-sm font-medium capitalize">{patient.gender || '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Clinical Data</h2>
            <dl className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <dt className="text-sm text-gray-500">Height</dt>
                <dd className="text-sm font-medium">{patient.height ? `${patient.height} cm` : '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Current Weight</dt>
                <dd className="text-sm font-medium">{patient.weight ? `${patient.weight} kg` : '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Target Weight</dt>
                <dd className="text-sm font-medium">{patient.targetWeight ? `${patient.targetWeight} kg` : '—'}</dd>
              </div>
            </dl>

            {patient.goals && (
              <div className="mb-4">
                <dt className="text-sm text-gray-500">Goals</dt>
                <dd className="text-sm mt-1 whitespace-pre-wrap">{patient.goals}</dd>
              </div>
            )}

            {patient.medicalHistory && (
              <div className="mb-4">
                <dt className="text-sm text-gray-500">Medical History</dt>
                <dd className="text-sm mt-1 whitespace-pre-wrap">{patient.medicalHistory}</dd>
              </div>
            )}

            {patient.allergies.length > 0 && (
              <div className="mb-4">
                <dt className="text-sm text-gray-500">Allergies</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{a}</span>
                  ))}
                </dd>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Consultations</span>
                <span className="text-sm font-medium">{patient._count.consultations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Meal Plans</span>
                <span className="text-sm font-medium">{patient._count.mealPlans}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Documents</span>
                <span className="text-sm font-medium">{patient._count.documents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Appointments</span>
                <span className="text-sm font-medium">{patient._count.appointments}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-2">Patient Since</h2>
            <p className="text-sm text-gray-600">{new Date(patient.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
