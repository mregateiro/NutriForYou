'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface FoodItem {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

interface Meal {
  id: string
  mealType: string
  name: string | null
  time: string | null
  totalCalories: number | null
  totalProtein: number | null
  totalCarbs: number | null
  totalFat: number | null
  foodItems: FoodItem[]
}

interface MealPlanDay {
  id: string
  dayOfWeek: string
  meals: Meal[]
}

interface MealPlanDetail {
  id: string
  title: string
  description: string | null
  status: string
  totalCalories: number | null
  totalProtein: number | null
  totalCarbs: number | null
  totalFat: number | null
  aiGenerated: boolean
  aiPrompt: string | null
  notes: string | null
  createdAt: string
  patient: {
    id: string
    firstName: string
    lastName: string
    allergies: string[]
    dietaryRestrictions: string[]
  }
  days: MealPlanDay[]
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: '🌅 Breakfast',
  MORNING_SNACK: '🍎 Morning Snack',
  LUNCH: '🍽️ Lunch',
  AFTERNOON_SNACK: '🥤 Afternoon Snack',
  DINNER: '🌙 Dinner',
  EVENING_SNACK: '🫖 Evening Snack',
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
}

export default function MealPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [mealPlan, setMealPlan] = useState<MealPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMealPlan() {
      try {
        const res = await fetch(`/api/meal-plans/${params.id}`)
        if (!res.ok) { router.push('/meal-plans'); return }
        const result = await res.json()
        setMealPlan(result.data)
      } catch {
        router.push('/meal-plans')
      } finally {
        setLoading(false)
      }
    }
    fetchMealPlan()
  }, [params.id, router])

  const handleStatusChange = async (newStatus: string) => {
    if (!mealPlan) return
    try {
      const res = await fetch(`/api/meal-plans/${mealPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setMealPlan(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!mealPlan) return
    const name = prompt('Template name:')
    if (!name) return

    try {
      const res = await fetch('/api/meal-plans/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mealPlanId: mealPlan.id }),
      })
      if (res.ok) {
        alert('Template saved!')
      }
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (!mealPlan) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/meal-plans" className="text-sm text-gray-500 hover:text-gray-700">← Back to meal plans</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {mealPlan.title}
            {mealPlan.aiGenerated && <span className="ml-2 text-green-600 text-sm">🤖 AI Generated</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Patient: <Link href={`/patients/${mealPlan.patient.id}`} className="text-indigo-600">{mealPlan.patient.firstName} {mealPlan.patient.lastName}</Link>
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleSaveAsTemplate} className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50">
            Save as Template
          </button>
          {mealPlan.status === 'DRAFT' && (
            <button onClick={() => handleStatusChange('ACTIVE')} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
              Activate
            </button>
          )}
          {mealPlan.status === 'ACTIVE' && (
            <button onClick={() => handleStatusChange('ARCHIVED')} className="px-3 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700">
              Archive
            </button>
          )}
        </div>
      </div>

      {/* Macro summary */}
      {mealPlan.totalCalories && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Avg Calories/day</p>
            <p className="text-2xl font-bold text-orange-600">{Math.round(mealPlan.totalCalories)}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Protein</p>
            <p className="text-2xl font-bold text-red-600">{Math.round(mealPlan.totalProtein || 0)}g</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Carbs</p>
            <p className="text-2xl font-bold text-blue-600">{Math.round(mealPlan.totalCarbs || 0)}g</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Fat</p>
            <p className="text-2xl font-bold text-yellow-600">{Math.round(mealPlan.totalFat || 0)}g</p>
          </div>
        </div>
      )}

      {/* Days */}
      <div className="space-y-6">
        {mealPlan.days.map(day => (
          <div key={day.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-indigo-50 px-6 py-3">
              <h2 className="text-lg font-semibold text-indigo-900">{DAY_LABELS[day.dayOfWeek] || day.dayOfWeek}</h2>
            </div>

            <div className="divide-y">
              {day.meals.map(meal => (
                <div key={meal.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}
                      {meal.time && <span className="text-sm text-gray-500 ml-2">{meal.time}</span>}
                    </h3>
                    {meal.totalCalories && (
                      <span className="text-sm text-gray-500">{Math.round(meal.totalCalories)} kcal</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {meal.foodItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-700">
                          {item.name}
                          {item.quantity && item.unit && (
                            <span className="text-gray-400 ml-1">({item.quantity} {item.unit})</span>
                          )}
                        </span>
                        <div className="flex space-x-3 text-xs text-gray-400">
                          {item.calories && <span>{item.calories} kcal</span>}
                          {item.protein && <span>P: {item.protein}g</span>}
                          {item.carbs && <span>C: {item.carbs}g</span>}
                          {item.fat && <span>F: {item.fat}g</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
