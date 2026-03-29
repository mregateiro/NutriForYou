'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface MobileNavProps {
  items: { href: string; label: string }[]
  email: string
}

export function MobileNav({ items, email }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const closeMenu = useCallback(() => {
    setOpen(false)
    toggleRef.current?.focus()
  }, [])

  // Escape key handler
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, closeMenu])

  // Focus trap
  useEffect(() => {
    if (!open || !menuRef.current) return
    const menu = menuRef.current
    const focusable = menu.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first.focus()

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    menu.addEventListener('keydown', trapFocus)
    return () => menu.removeEventListener('keydown', trapFocus)
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        ref={toggleRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        aria-expanded={open}
        aria-label="Toggle navigation menu"
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu panel */}
          <div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <h2 className="text-lg font-bold text-indigo-600">Menu</h2>
              <button
                onClick={closeMenu}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="px-2 py-4 space-y-1" aria-label="Mobile navigation">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
              <p className="text-xs text-gray-500 truncate mb-2">{email}</p>
              <Link
                href="/api/auth/signout"
                onClick={closeMenu}
                className="block text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Sign out
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
