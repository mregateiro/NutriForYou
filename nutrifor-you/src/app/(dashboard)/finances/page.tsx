'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface FinancialSummary {
  totalRevenue: number
  monthlyRevenue: number
  lastMonthRevenue: number
  pendingAmount: number
  pendingCount: number
  overdueInvoices: number
  recentPayments: {
    id: string
    amount: number
    currency: string
    status: string
    createdAt: string
    patient: { firstName: string; lastName: string }
  }[]
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  method: string | null
  description: string | null
  paidAt: string | null
  createdAt: string
  patient: { id: string; firstName: string; lastName: string }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
}

const STATUS_ICONS: Record<string, string> = {
  PENDING: '◷',
  COMPLETED: '✓',
  FAILED: '✕',
  REFUNDED: '↩',
}

export default function FinancesPage() {
  const [tab, setTab] = useState<'overview' | 'payments'>('overview')
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetch('/api/payments/summary')
      .then(res => res.json())
      .then(result => setSummary(result.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), perPage: '20' })
      const res = await fetch(`/api/payments?${params}`)
      const result = await res.json()
      setPayments(result.data || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    }
  }, [page])

  useEffect(() => {
    if (tab === 'payments') fetchPayments()
  }, [tab, fetchPayments])

  const formatCurrency = (amount: number, currency = 'EUR') =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(amount)

  if (loading) return <div className="text-center py-12 text-gray-500">Loading finances...</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/finances/invoices"
            className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 text-sm font-medium"
          >
            Invoices
          </Link>
          <Link
            href="/finances/payments/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            + Record Payment
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border rounded-md overflow-hidden mb-6 w-fit" role="tablist" aria-label="Finance view">
        <button
          onClick={() => setTab('overview')}
          role="tab"
          aria-selected={tab === 'overview'}
          className={`px-4 py-2 text-sm font-medium ${tab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('payments')}
          role="tab"
          aria-selected={tab === 'payments'}
          className={`px-4 py-2 text-sm font-medium ${tab === 'payments' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
        >
          All Payments
        </button>
      </div>

      {tab === 'overview' && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.monthlyRevenue)}</p>
              {summary.lastMonthRevenue > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  vs {formatCurrency(summary.lastMonthRevenue)} last month
                </p>
              )}
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pendingAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">{summary.pendingCount} payment(s)</p>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-sm text-gray-500">Overdue Invoices</p>
              <p className="text-2xl font-bold text-red-600">{summary.overdueInvoices}</p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
            {summary.recentPayments.length === 0 ? (
              <p className="text-gray-500 text-sm">No payments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {summary.recentPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {payment.patient.firstName} {payment.patient.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_COLORS[payment.status] || ''}`}>
                        {STATUS_ICONS[payment.status] || '●'} {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No payments found.</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/patients/${payment.patient.id}`} className="text-indigo-600 hover:text-indigo-500 font-medium">
                          {payment.patient.firstName} {payment.patient.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.method || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_COLORS[payment.status] || ''}`}>
                          {STATUS_ICONS[payment.status] || '●'} {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="flex justify-center space-x-2 mt-4" aria-label="Payments pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-500" aria-live="polite" aria-atomic="true">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
