'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  label: string
  isAdmin?: boolean
}

export function NavLink({ href, label, isAdmin }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const baseClasses = isAdmin
    ? 'text-red-700 hover:text-red-800 hover:bg-red-50'
    : isActive
      ? 'text-indigo-600 bg-indigo-50'
      : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'

  return (
    <Link
      href={href}
      className={`${baseClasses} px-3 py-2 text-sm font-medium rounded-md transition-colors`}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}
