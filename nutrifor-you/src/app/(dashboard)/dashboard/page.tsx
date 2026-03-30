import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDashboardAnalytics } from '@/services/analytics.service'
import { logger } from '@/lib/logger'

type DashboardAnalytics = Awaited<ReturnType<typeof getDashboardAnalytics>>

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  let analytics: DashboardAnalytics | null = null

  if (session?.user?.id) {
    try {
      analytics = await getDashboardAnalytics(session.user.id)
    } catch (error) {
      logger.error({ error }, 'Failed to load dashboard analytics')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome back, {session?.user?.name || 'User'}!
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Patients</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{analytics ? analytics.patients.total : '—'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Consultations This Month</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{analytics ? analytics.consultations.thisMonth : '—'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Active Meal Plans</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{analytics ? analytics.mealPlans.total : '—'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Upcoming Appointments</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{analytics ? analytics.appointments.upcoming : '—'}</p>
        </div>
      </div>
    </div>
  )
}
