'use client'

import { useState, useEffect, useCallback } from 'react'

interface Analytics {
  patients: { total: number; active: number; newThisMonth: number }
  consultations: { total: number; thisMonth: number; completed: number; completionRate: number }
  mealPlans: { total: number; thisMonth: number }
  appointments: { upcoming: number }
  revenue: { total: number; thisMonth: number; pending: number }
  contracts: { active: number }
  recentConsultations: Array<{
    id: string
    status: string
    createdAt: string
    patient: { firstName: string; lastName: string }
  }>
  patientGrowth: Array<{ month: string; count: number }>
}

function MetricCard({ title, value, subtitle, color = 'indigo' }: {
  title: string
  value: string | number
  subtitle?: string
  color?: string
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]?.split(' ')[1] || 'text-gray-900'}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics')
      const result = await res.json()
      setAnalytics(result.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="text-center py-12 text-gray-500">Failed to load analytics.</div>
  }

  const maxGrowth = Math.max(...analytics.patientGrowth.map((g) => g.count), 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reporting</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Patients"
          value={analytics.patients.total}
          subtitle={`${analytics.patients.active} active · ${analytics.patients.newThisMonth} new this month`}
          color="indigo"
        />
        <MetricCard
          title="Consultations"
          value={analytics.consultations.total}
          subtitle={`${analytics.consultations.thisMonth} this month · ${analytics.consultations.completionRate}% completed`}
          color="blue"
        />
        <MetricCard
          title="Meal Plans"
          value={analytics.mealPlans.total}
          subtitle={`${analytics.mealPlans.thisMonth} this month`}
          color="green"
        />
        <MetricCard
          title="Upcoming Appointments"
          value={analytics.appointments.upcoming}
          color="purple"
        />
      </div>

      {/* Revenue & Contracts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          title="Total Revenue"
          value={`€${analytics.revenue.total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`}
          subtitle={`€${analytics.revenue.thisMonth.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} this month`}
          color="green"
        />
        <MetricCard
          title="Pending Payments"
          value={`€${analytics.revenue.pending.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`}
          color="yellow"
        />
        <MetricCard
          title="Active Contracts"
          value={analytics.contracts.active}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Growth Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Growth (Last 6 Months)</h2>
          <div className="flex items-end space-x-2 h-40">
            {analytics.patientGrowth.map((g) => (
              <div key={g.month} className="flex-1 flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">{g.count}</span>
                <div
                  className="w-full bg-indigo-400 rounded-t"
                  style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: g.count > 0 ? '8px' : '2px' }}
                />
                <span className="text-xs text-gray-400 mt-2">{g.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Consultations</h2>
          {analytics.recentConsultations.length === 0 ? (
            <p className="text-sm text-gray-500">No recent consultations.</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentConsultations.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {c.patient.firstName} {c.patient.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    c.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {c.status === 'COMPLETED' ? '✓ ' : '● '}{c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
