import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-bold text-indigo-600">NutriForYou</span>
              <div className="hidden md:flex space-x-4">
                <a href="/dashboard" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/patients" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">
                  Patients
                </a>
                <a href="/consultations" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">
                  Consultations
                </a>
                <a href="/meal-plans" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">
                  Meal Plans
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{session.user.email}</span>
              <a
                href="/api/auth/signout"
                className="text-sm text-gray-700 hover:text-red-600"
              >
                Sign out
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
