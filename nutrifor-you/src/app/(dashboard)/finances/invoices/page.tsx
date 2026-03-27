'use client'

import { useState, useEffect, useCallback } from 'react'

interface Invoice {
  id: string
  number: string
  status: string
  subtotal: number
  tax: number
  total: number
  currency: string
  dueDate: string | null
  paidAt: string | null
  createdAt: string
  items: { id: string; description: string; total: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELED: 'bg-gray-100 text-gray-600',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), perPage: '20' })
      const res = await fetch(`/api/invoices?${params}`)
      const result = await res.json()
      setInvoices(result.data || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const formatCurrency = (amount: number, currency = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount)

  const updateInvoiceStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        fetchInvoices()
      }
    } catch (error) {
      console.error('Failed to update invoice:', error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No invoices found.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${STATUS_COLORS[invoice.status] || ''}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {invoice.status === 'DRAFT' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'SENT')}
                          className="text-blue-600 hover:text-blue-500"
                        >
                          Send
                        </button>
                      )}
                      {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'PAID')}
                          className="text-green-600 hover:text-green-500"
                        >
                          Mark Paid
                        </button>
                      )}
                      {invoice.status !== 'CANCELED' && invoice.status !== 'PAID' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'CANCELED')}
                          className="text-red-600 hover:text-red-500"
                        >
                          Cancel
                        </button>
                      )}
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
