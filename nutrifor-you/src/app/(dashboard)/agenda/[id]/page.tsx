'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Appointment {
  id: string
  title: string | null
  description: string | null
  startsAt: string
  endsAt: string
  status: string
  type: string
  location: string | null
  videoLink: string | null
  cancelReason: string | null
  notes: string | null
  createdAt: string
  patient: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  }
  consultation: { id: string; title: string; status: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/appointments/${id}`)
      .then(res => res.json())
      .then(result => setAppointment(result.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (status: string, cancelReason?: string) => {
    try {
      const body: Record<string, string> = { status }
      if (cancelReason) body.cancelReason = cancelReason

      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const result = await res.json()
        setAppointment(prev => prev ? { ...prev, ...result.data } : null)
      }
    } catch (error) {
      console.error('Failed to update appointment:', error)
    }
  }

  const handleCancel = () => {
    const reason = prompt('Reason for cancellation (optional):')
    updateStatus('CANCELED', reason || undefined)
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!appointment) return <div className="text-center py-12 text-gray-500">Appointment not found</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {appointment.title || 'Appointment'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(appointment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[appointment.status] || 'bg-gray-100 text-gray-800'}`}>
          {appointment.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
              <dd className="text-sm text-gray-900">
                {new Date(appointment.startsAt).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
                <br />
                {new Date(appointment.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(appointment.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="text-sm text-gray-900">{appointment.type.replace('_', ' ')}</dd>
            </div>
            {appointment.location && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="text-sm text-gray-900">{appointment.location}</dd>
              </div>
            )}
            {appointment.videoLink && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Video Link</dt>
                <dd className="text-sm">
                  <a href={appointment.videoLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    Join Video Call
                  </a>
                </dd>
              </div>
            )}
            {appointment.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{appointment.notes}</dd>
              </div>
            )}
            {appointment.cancelReason && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cancel Reason</dt>
                <dd className="text-sm text-red-600">{appointment.cancelReason}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-sm">
                <Link href={`/patients/${appointment.patient.id}`} className="text-indigo-600 hover:text-indigo-500">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </Link>
              </dd>
            </div>
            {appointment.patient.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{appointment.patient.email}</dd>
              </div>
            )}
            {appointment.patient.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{appointment.patient.phone}</dd>
              </div>
            )}
          </dl>

          {appointment.consultation && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Linked Consultation</h3>
              <Link
                href={`/consultations/${appointment.consultation.id}`}
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                {appointment.consultation.title} ({appointment.consultation.status})
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {appointment.status === 'SCHEDULED' && (
          <>
            <button
              onClick={() => updateStatus('CONFIRMED')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
            >
              Confirm
            </button>
            <button
              onClick={() => updateStatus('IN_PROGRESS')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm font-medium"
            >
              Start
            </button>
          </>
        )}
        {appointment.status === 'CONFIRMED' && (
          <button
            onClick={() => updateStatus('IN_PROGRESS')}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm font-medium"
          >
            Start
          </button>
        )}
        {(appointment.status === 'IN_PROGRESS' || appointment.status === 'CONFIRMED') && (
          <button
            onClick={() => updateStatus('COMPLETED')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium"
          >
            Complete
          </button>
        )}
        {appointment.status !== 'CANCELED' && appointment.status !== 'COMPLETED' && (
          <>
            <button
              onClick={handleCancel}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => updateStatus('NO_SHOW')}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 text-sm font-medium"
            >
              No Show
            </button>
          </>
        )}
        <button
          onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
        >
          Back
        </button>
      </div>
    </div>
  )
}
