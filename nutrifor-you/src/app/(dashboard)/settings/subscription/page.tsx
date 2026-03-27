'use client'

import { useState, useEffect } from 'react'

interface Subscription {
  id: string
  tier: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  canceledAt: string | null
}

interface Pricing {
  LITE: { monthly: number; annual: number; currency: string }
  PREMIUM: { monthly: number; annual: number; currency: string }
  BUSINESS: { monthly: number; annual: number; currency: string }
}

const PLAN_FEATURES: Record<string, string[]> = {
  TRIAL: ['5 patients', '10 consultations', 'Basic meal plans', '30-day trial'],
  LITE: ['50 patients', 'Unlimited consultations', 'Basic meal plans', 'Document upload'],
  PREMIUM: ['Unlimited patients', 'AI meal plans', 'Scheduling', 'Chat', 'Analytics'],
  BUSINESS: ['Unlimited patients', 'AI meal plans', 'Team management', 'Branding', 'API access'],
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')

  useEffect(() => {
    fetch('/api/subscription')
      .then(res => res.json())
      .then(result => {
        setSubscription(result.data?.subscription)
        setPricing(result.data?.pricing)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleChangePlan = async (tier: string) => {
    if (subscription?.tier === tier) return
    if (!confirm(`Change your plan to ${tier}?`)) return

    setUpdating(true)
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle }),
      })

      if (res.ok) {
        const result = await res.json()
        setSubscription(result.data)
      }
    } catch (error) {
      console.error('Failed to change plan:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return

    setUpdating(true)
    try {
      const res = await fetch('/api/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: false }),
      })

      if (res.ok) {
        const result = await res.json()
        setSubscription(result.data)
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
    } finally {
      setUpdating(false)
    }
  }

  const formatCurrency = (amount: number, currency = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount)

  if (loading) return <div className="text-center py-12 text-gray-500">Loading subscription...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscription & Plans</h1>

      {subscription && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Plan</h2>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-800">
                {subscription.tier}
              </span>
              <span className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                subscription.status === 'TRIALING' ? 'bg-blue-100 text-blue-800' :
                subscription.status === 'CANCELED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {subscription.status}
              </span>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-500 mt-1">
                  {subscription.status === 'CANCELED' ? 'Access until: ' : 'Renews: '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {subscription.trialEndsAt && subscription.status === 'TRIALING' && (
                <p className="text-sm text-yellow-600 mt-1">
                  Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription.status !== 'CANCELED' && subscription.tier !== 'TRIAL' && (
              <button
                onClick={handleCancel}
                disabled={updating}
                className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="flex gap-1 border rounded-md overflow-hidden">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-4 py-2 text-sm font-medium ${billingCycle === 'MONTHLY' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('ANNUAL')}
            className={`px-4 py-2 text-sm font-medium ${billingCycle === 'ANNUAL' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Annual (save ~17%)
          </button>
        </div>
      </div>

      {pricing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['LITE', 'PREMIUM', 'BUSINESS'] as const).map(tier => {
            const price = pricing[tier]
            const isCurrent = subscription?.tier === tier
            const amount = billingCycle === 'ANNUAL' ? price.annual : price.monthly

            return (
              <div
                key={tier}
                className={`bg-white shadow rounded-lg p-6 border-2 ${
                  tier === 'PREMIUM' ? 'border-indigo-500' : isCurrent ? 'border-green-500' : 'border-transparent'
                }`}
              >
                {tier === 'PREMIUM' && (
                  <span className="text-xs font-semibold text-indigo-600 uppercase">Most Popular</span>
                )}
                <h3 className="text-xl font-bold text-gray-900 mt-1">{tier}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(amount, price.currency)}
                  </span>
                  <span className="text-sm text-gray-500">
                    /{billingCycle === 'ANNUAL' ? 'year' : 'month'}
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {PLAN_FEATURES[tier].map(feature => (
                    <li key={feature} className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleChangePlan(tier)}
                  disabled={isCurrent || updating}
                  className={`mt-6 w-full py-2 rounded-md text-sm font-medium ${
                    isCurrent
                      ? 'bg-green-100 text-green-800 cursor-default'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Upgrade to ${tier}`}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
