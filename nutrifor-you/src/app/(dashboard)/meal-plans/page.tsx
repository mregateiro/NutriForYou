'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface MealPlan {
  id: string
  title: string
  status: string
  totalCalories: number | null
  aiGenerated: boolean
  createdAt: string
  patient: { id: string; firstName: string; lastName: string }
  _count: { days: number }
}

export default function MealPlansPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchMealPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meal-plans?page=${page}&perPage=20`)
      const result = await res.json()
      setMealPlans(result.data || [])
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch meal plans:', error)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchMealPlans()
  }, [fetchMealPlans])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
        <div className="flex space-x-3">
          <Link href="/meal-plans/generate" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium">
            🤖 Generate with AI
          </Link>
          <Link href="/meal-plans/templates" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium">
            Templates
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : mealPlans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No meal plans yet.</p>
          <Link href="/meal-plans/generate" className="mt-2 text-green-600 hover:text-green-500 text-sm">
            Generate your first meal plan with AI
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mealPlans.map((mp) => (
              <Link
                key={mp.id}
                href={`/meal-plans/${mp.id}`}
                className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-900">{mp.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    mp.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                    : mp.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {mp.status === 'ACTIVE' ? '✓ ' : mp.status === 'ARCHIVED' ? '▪ ' : '● '}{mp.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {mp.patient.firstName} {mp.patient.lastName}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <span>{mp._count.days} days</span>
                  {mp.totalCalories && <span>{Math.round(mp.totalCalories)} kcal/day</span>}
                  {mp.aiGenerated && <span className="text-green-600">🤖 AI</span>}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(mp.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex justify-center space-x-2 mt-6" aria-label="Meal plans pagination">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
              <span className="px-3 py-1 text-sm text-gray-500" aria-live="polite" aria-atomic="true">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page" className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
