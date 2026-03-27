'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Patient {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  createdAt: string
  _count: { consultations: number; mealPlans: number }
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), perPage: '20' })
      if (search) params.set('query', search)

      const res = await fetch(`/api/patients?${params}`)
      const result = await res.json()

      setPatients(result.data || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch patients:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <Link
          href="/patients/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          + New Patient
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search patients by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full md:w-96 rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading patients...</div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No patients found.</p>
          <Link href="/patients/new" className="mt-2 text-indigo-600 hover:text-indigo-500 text-sm">
            Register your first patient
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultations</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meal Plans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/patients/${patient.id}`} className="text-indigo-600 hover:text-indigo-500 font-medium">
                        {patient.firstName} {patient.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.email || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.phone || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient._count.consultations}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient._count.mealPlans}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/patients/${patient.id}`} className="text-indigo-600 hover:text-indigo-500 mr-4">
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
              <span className="px-3 py-1 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
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
