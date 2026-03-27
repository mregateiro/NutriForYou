'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Consultation {
  id: string
  title: string | null
  status: string
  duration: number | null
  createdAt: string
  patient: { id: string; firstName: string; lastName: string }
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchConsultations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), perPage: '20' })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/consultations?${params}`)
      const result = await res.json()
      setConsultations(result.data || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch consultations:', error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
        <Link
          href="/consultations/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          + New Consultation
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No consultations found.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {consultations.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <Link href={`/consultations/${c.id}`} className="text-indigo-600 hover:text-indigo-500 font-medium">
                        {c.title || 'Untitled'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <Link href={`/patients/${c.patient.id}`} className="hover:text-indigo-500">
                        {c.patient.firstName} {c.patient.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        c.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {c.duration ? `${c.duration} min` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link href={`/consultations/${c.id}`} className="text-indigo-600 hover:text-indigo-500">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
