'use client'

import { useState, useEffect, useCallback } from 'react'

interface ComplianceStatus {
  gdpr: Record<string, boolean>
  hipaa: Record<string, boolean>
  lgpd: Record<string, boolean>
  stats: { totalConsents: number; totalAuditLogs: number; totalUsers: number }
  retentionPolicies: Array<{ entity: string; retentionDays: number; description: string }>
  breachReports: Array<{
    id: string
    reportedAt: string
    severity: string
    description: string
    affectedUsers: number
    status: string
  }>
}

function ComplianceCheckItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-xs px-2 py-1 rounded-full ${enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {enabled ? '✓ Enabled' : '✗ Disabled'}
      </span>
    </div>
  )
}

export default function CompliancePage() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/compliance')
      if (res.status === 403) {
        setError('Access denied. Admin role required.')
        return
      }
      const result = await res.json()
      setStatus(result.data)
    } catch {
      setError('Failed to load compliance status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const enforceRetention = async () => {
    setActionLoading(true)
    try {
      await fetch('/api/admin/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enforce-retention' }),
      })
      fetchStatus()
      alert('Retention policies enforced successfully')
    } catch {
      alert('Failed to enforce retention policies')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>
  if (!status) return null

  const formatLabel = (key: string) =>
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Regulatory Compliance</h1>

      {/* Compliance Frameworks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span className="text-lg">🇪🇺</span>
            <span>GDPR</span>
          </h2>
          <div className="divide-y">
            {Object.entries(status.gdpr).map(([key, val]) => (
              <ComplianceCheckItem key={key} label={formatLabel(key)} enabled={val} />
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span className="text-lg">🇺🇸</span>
            <span>HIPAA</span>
          </h2>
          <div className="divide-y">
            {Object.entries(status.hipaa).map(([key, val]) => (
              <ComplianceCheckItem key={key} label={formatLabel(key)} enabled={val} />
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span className="text-lg">🇧🇷</span>
            <span>LGPD</span>
          </h2>
          <div className="divide-y">
            {Object.entries(status.lgpd).map(([key, val]) => (
              <ComplianceCheckItem key={key} label={formatLabel(key)} enabled={val} />
            ))}
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Data Retention Policies</h2>
          <button
            onClick={enforceRetention}
            disabled={actionLoading}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm font-medium disabled:opacity-50"
          >
            {actionLoading ? 'Running...' : 'Enforce Now'}
          </button>
        </div>
        <div className="divide-y">
          {status.retentionPolicies.map((p) => (
            <div key={p.entity} className="flex justify-between items-center py-3">
              <div>
                <span className="text-sm font-medium text-gray-900">{p.entity}</span>
                <p className="text-xs text-gray-500">{p.description}</p>
              </div>
              <span className="text-sm text-gray-600">{p.retentionDays} days</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breach Reports */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Breach Notifications</h2>
        {status.breachReports.length === 0 ? (
          <p className="text-sm text-gray-500">No breach reports filed. ✓</p>
        ) : (
          <div className="divide-y">
            {status.breachReports.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                    r.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    r.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{r.severity}</span>
                  <span className="text-sm font-medium">{r.description}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Reported: {new Date(r.reportedAt).toLocaleString()} · Affected: {r.affectedUsers} users · Status: {r.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-indigo-700">{status.stats.totalConsents}</p>
          <p className="text-xs text-gray-500">Consent Records</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{status.stats.totalAuditLogs}</p>
          <p className="text-xs text-gray-500">Audit Log Entries</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{status.stats.totalUsers}</p>
          <p className="text-xs text-gray-500">Total Users</p>
        </div>
      </div>
    </div>
  )
}
