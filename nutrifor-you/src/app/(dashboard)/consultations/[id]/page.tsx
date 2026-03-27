'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface ConsultationDetail {
  id: string
  title: string | null
  chiefComplaint: string | null
  notes: string | null
  assessment: string | null
  plan: string | null
  privateNotes: string | null
  duration: number | null
  weight: number | null
  height: number | null
  bmi: number | null
  bodyFat: number | null
  waistCirc: number | null
  hipCirc: number | null
  status: string
  scheduledAt: string | null
  completedAt: string | null
  createdAt: string
  patient: {
    id: string
    firstName: string
    lastName: string
    email: string | null
  }
  template: { id: string; name: string } | null
  attachments: { id: string; fileName: string; fileSize: number; mimeType: string; createdAt: string }[]
}

export default function ConsultationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConsultation() {
      try {
        const res = await fetch(`/api/consultations/${params.id}`)
        if (!res.ok) { router.push('/consultations'); return }
        const result = await res.json()
        setConsultation(result.data)
      } catch {
        router.push('/consultations')
      } finally {
        setLoading(false)
      }
    }
    fetchConsultation()
  }, [params.id, router])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!consultation) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/consultations" className="text-sm text-gray-500 hover:text-gray-700">← Back to consultations</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{consultation.title || 'Consultation'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Patient: <Link href={`/patients/${consultation.patient.id}`} className="text-indigo-600 hover:text-indigo-500">
              {consultation.patient.firstName} {consultation.patient.lastName}
            </Link>
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          consultation.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {consultation.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {consultation.chiefComplaint && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-2">Chief Complaint</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{consultation.chiefComplaint}</p>
            </div>
          )}

          {consultation.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-2">Notes</h2>
              <div className="text-gray-700 whitespace-pre-wrap">{consultation.notes}</div>
            </div>
          )}

          {consultation.assessment && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-2">Assessment</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{consultation.assessment}</p>
            </div>
          )}

          {consultation.plan && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-2">Plan</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{consultation.plan}</p>
            </div>
          )}

          {consultation.privateNotes && (
            <div className="bg-amber-50 border border-amber-200 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-2 text-amber-800">🔒 Private Notes</h2>
              <p className="text-amber-900 whitespace-pre-wrap">{consultation.privateNotes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Measurements</h2>
            <dl className="space-y-3">
              {consultation.weight && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Weight</dt>
                  <dd className="text-sm font-medium">{consultation.weight} kg</dd>
                </div>
              )}
              {consultation.height && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Height</dt>
                  <dd className="text-sm font-medium">{consultation.height} cm</dd>
                </div>
              )}
              {consultation.bmi && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">BMI</dt>
                  <dd className="text-sm font-medium">{consultation.bmi}</dd>
                </div>
              )}
              {consultation.bodyFat && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Body Fat</dt>
                  <dd className="text-sm font-medium">{consultation.bodyFat}%</dd>
                </div>
              )}
              {consultation.duration && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Duration</dt>
                  <dd className="text-sm font-medium">{consultation.duration} min</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Details</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Date</dt>
                <dd className="text-sm font-medium">{new Date(consultation.createdAt).toLocaleDateString()}</dd>
              </div>
              {consultation.template && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Template</dt>
                  <dd className="text-sm font-medium">{consultation.template.name}</dd>
                </div>
              )}
            </dl>
          </div>

          {consultation.attachments.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Attachments</h2>
              <ul className="space-y-2">
                {consultation.attachments.map(doc => (
                  <li key={doc.id} className="flex items-center text-sm">
                    <span className="text-gray-600">{doc.fileName}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
