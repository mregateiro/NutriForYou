'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Appointment {
  id: string
  title: string | null
  startsAt: string
  endsAt: string
  status: string
  type: string
  location: string | null
  patient: { id: string; firstName: string; lastName: string }
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
}

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week' | 'list'>('list')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        from: new Date(dateFrom).toISOString(),
        to: new Date(dateTo).toISOString(),
        perPage: '100',
      })
      const res = await fetch(`/api/appointments?${params}`)
      const result = await res.json()
      setAppointments(result.data || [])
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  // Group appointments by date for weekly view
  const groupedByDate = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const dateKey = new Date(apt.startsAt).toISOString().split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(apt)
    return acc
  }, {})

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/agenda/availability"
            className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 text-sm font-medium"
          >
            Availability
          </Link>
          <Link
            href="/agenda/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            + New Appointment
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 border rounded-md overflow-hidden">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            List
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-sm ${view === 'week' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Week
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No appointments scheduled.</p>
          <Link href="/agenda/new" className="mt-2 text-indigo-600 hover:text-indigo-500 text-sm">
            Schedule your first appointment
          </Link>
        </div>
      ) : view === 'list' ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-900">{formatDateTime(apt.startsAt)}</div>
                    <div className="text-gray-500">{formatTime(apt.startsAt)} – {formatTime(apt.endsAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/patients/${apt.patient.id}`} className="text-indigo-600 hover:text-indigo-500 font-medium text-sm">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {apt.type.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link href={`/agenda/${apt.id}`} className="text-indigo-600 hover:text-indigo-500">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, apts]) => (
            <div key={date} className="bg-white shadow rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="space-y-2">
                {apts.map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/agenda/${apt.id}`}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-indigo-600">
                        {formatTime(apt.startsAt)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{apt.type.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'}`}>
                      {apt.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
