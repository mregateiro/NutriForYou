'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface SystemStats {
  totalUsers: number
  totalPatients: number
  totalConsultations: number
  totalMealPlans: number
  totalAppointments: number
  activeSubscriptions: number
  usersByRole: Record<string, number>
  subscriptionsByTier: Record<string, number>
}

function StatCard({ label, value, color = 'indigo' }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-700',
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    yellow: 'text-yellow-700',
  }
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color] || 'text-gray-900'}`}>{value.toLocaleString()}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 403) {
        setError('Access denied. Admin role required.')
        return
      }
      const result = await res.json()
      setStats(result.data)
    } catch {
      setError('Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>
  if (!stats) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Administration</h1>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/users" className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900">User Management</h3>
          <p className="text-sm text-gray-500 mt-1">Manage users, roles & access</p>
        </Link>
        <Link href="/admin/feature-flags" className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900">Feature Flags</h3>
          <p className="text-sm text-gray-500 mt-1">Toggle features per tier</p>
        </Link>
        <Link href="/admin/audit-logs" className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900">Audit Logs</h3>
          <p className="text-sm text-gray-500 mt-1">View system activity</p>
        </Link>
        <Link href="/admin/compliance" className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900">Compliance</h3>
          <p className="text-sm text-gray-500 mt-1">GDPR/HIPAA controls</p>
        </Link>
      </div>

      {/* System Stats */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers} color="indigo" />
        <StatCard label="Patients" value={stats.totalPatients} color="blue" />
        <StatCard label="Consultations" value={stats.totalConsultations} color="green" />
        <StatCard label="Meal Plans" value={stats.totalMealPlans} color="purple" />
        <StatCard label="Appointments" value={stats.totalAppointments} color="yellow" />
        <StatCard label="Active Subs" value={stats.activeSubscriptions} color="green" />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Users by Role</h3>
          <div className="space-y-3">
            {Object.entries(stats.usersByRole).map(([role, count]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{role}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(stats.usersByRole).length === 0 && (
              <p className="text-sm text-gray-400">No users yet</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Subscriptions by Tier</h3>
          <div className="space-y-3">
            {Object.entries(stats.subscriptionsByTier).map(([tier, count]) => (
              <div key={tier} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{tier}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(stats.subscriptionsByTier).length === 0 && (
              <p className="text-sm text-gray-400">No active subscriptions</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
