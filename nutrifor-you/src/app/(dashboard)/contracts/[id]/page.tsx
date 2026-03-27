'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Contract {
  id: string
  title: string
  content: string
  status: string
  signedAt: string | null
  signatureData: string | null
  expiresAt: string | null
  createdAt: string
  patient: { id: string; firstName: string; lastName: string; email: string }
  createdBy: { id: string; name: string | null; email: string }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  SIGNED: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-yellow-100 text-yellow-700',
  REVOKED: 'bg-red-100 text-red-700',
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
      const result = await res.json()
      setContract(result.data)
    } catch (error) {
      console.error('Failed to fetch contract:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchContract()
  }, [fetchContract])

  const handleStatusChange = async (action: string) => {
    setActionLoading(true)
    try {
      const body: Record<string, string> = {}
      if (action === 'revoke') {
        body.action = 'revoke'
      } else {
        body.status = action
      }

      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        fetchContract()
      } else {
        const result = await res.json()
        alert(result.error || 'Failed to update contract')
      }
    } catch (error) {
      console.error('Failed to update contract:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract?')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/contracts')
      } else {
        const result = await res.json()
        alert(result.error || 'Failed to delete contract')
      }
    } catch (error) {
      console.error('Failed to delete contract:', error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Contract not found.</p>
        <Link href="/contracts" className="text-indigo-600 hover:text-indigo-500 text-sm mt-2 inline-block">
          ← Back to contracts
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/contracts" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
          <span className={`px-3 py-1 text-xs rounded-full ${STATUS_COLORS[contract.status] || ''}`}>
            {contract.status}
          </span>
        </div>

        <div className="flex space-x-2">
          {contract.status === 'DRAFT' && (
            <>
              <button
                onClick={() => handleStatusChange('SENT')}
                disabled={actionLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                Send to Patient
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          {(contract.status === 'SENT' || contract.status === 'SIGNED') && (
            <button
              onClick={() => handleStatusChange('revoke')}
              disabled={actionLoading}
              className="border border-red-300 text-red-700 px-4 py-2 rounded-md hover:bg-red-50 text-sm font-medium disabled:opacity-50"
            >
              Revoke
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract Content */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Contract Content</h2>
          <div className="prose max-w-none text-sm text-gray-700 whitespace-pre-wrap">
            {contract.content}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Patient</dt>
                <dd className="text-sm">
                  <Link href={`/patients/${contract.patient.id}`} className="text-indigo-600 hover:text-indigo-500">
                    {contract.patient.firstName} {contract.patient.lastName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Created By</dt>
                <dd className="text-sm text-gray-700">{contract.createdBy.name || contract.createdBy.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="text-sm text-gray-700">{new Date(contract.createdAt).toLocaleDateString()}</dd>
              </div>
              {contract.expiresAt && (
                <div>
                  <dt className="text-xs text-gray-500">Expires</dt>
                  <dd className="text-sm text-gray-700">{new Date(contract.expiresAt).toLocaleDateString()}</dd>
                </div>
              )}
              {contract.signedAt && (
                <div>
                  <dt className="text-xs text-gray-500">Signed</dt>
                  <dd className="text-sm text-green-700">{new Date(contract.signedAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {contract.signatureData && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Signature</h3>
              <div className="border rounded p-4 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">Digital signature recorded</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
