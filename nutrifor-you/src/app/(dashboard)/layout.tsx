import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { MobileNav } from './mobile-nav'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/patients', label: 'Patients' },
  { href: '/consultations', label: 'Consultations' },
  { href: '/meal-plans', label: 'Meal Plans' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/messages', label: 'Messages' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/finances', label: 'Finances' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
]

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
      {/* Skip to main content - Accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2">
        Skip to main content
      </a>

      <nav className="bg-white shadow-sm border-b" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600" aria-label="NutriForYou home">
                NutriForYou
              </Link>
              <div className="hidden lg:flex space-x-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <span className="text-sm text-gray-500 truncate max-w-[200px]">{session.user.email}</span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-700 hover:text-red-600 transition-colors"
              >
                Sign out
              </Link>
            </div>
            {/* Mobile hamburger menu */}
            <MobileNav items={NAV_ITEMS} email={session.user.email} />
          </div>
        </div>
      </nav>

      <main id="main-content" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8" role="main">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40" role="navigation" aria-label="Mobile navigation">
        <div className="flex justify-around items-center h-14">
          <Link href="/dashboard" className="flex flex-col items-center py-1 px-2 text-gray-600 hover:text-indigo-600 min-w-[60px]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>
          <Link href="/patients" className="flex flex-col items-center py-1 px-2 text-gray-600 hover:text-indigo-600 min-w-[60px]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] mt-0.5">Patients</span>
          </Link>
          <Link href="/agenda" className="flex flex-col items-center py-1 px-2 text-gray-600 hover:text-indigo-600 min-w-[60px]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[10px] mt-0.5">Agenda</span>
          </Link>
          <Link href="/meal-plans" className="flex flex-col items-center py-1 px-2 text-gray-600 hover:text-indigo-600 min-w-[60px]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <span className="text-[10px] mt-0.5">Plans</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center py-1 px-2 text-gray-600 hover:text-indigo-600 min-w-[60px]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] mt-0.5">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="lg:hidden h-14" />
    </div>
  )
}
