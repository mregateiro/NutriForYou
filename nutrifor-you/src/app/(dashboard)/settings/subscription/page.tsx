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

interface PaymentDetails {
  amount: number
  currency: string
  tier: string
  billingCycle: string
}

const PLAN_FEATURES: Record<string, string[]> = {
  TRIAL: ['5 patients', '10 consultations', 'Basic meal plans', '30-day trial'],
  LITE: ['50 patients', 'Unlimited consultations', 'Basic meal plans', 'Document upload'],
  PREMIUM: ['Unlimited patients', 'AI meal plans', 'Scheduling', 'Chat', 'Analytics'],
  BUSINESS: ['Unlimited patients', 'AI meal plans', 'Team management', 'Branding', 'API access'],
}

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mbway', label: 'MB WAY' },
]

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [paymentError, setPaymentError] = useState('')

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

    setUpdating(true)
    setPaymentError('')
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle }),
      })

      if (res.ok) {
        const result = await res.json()
        setSubscription(result.data)

        if (result.requiresPayment) {
          setPaymentDetails(result.paymentDetails)
          setShowPaymentModal(true)
        }
      }
    } catch (error) {
      console.error('Failed to initiate plan change:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleConfirmPayment = async () => {
    setUpdating(true)
    setPaymentError('')
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment', paymentMethod }),
      })

      if (res.ok) {
        const result = await res.json()
        setSubscription(result.data)
        setShowPaymentModal(false)
        setPaymentDetails(null)
      } else {
        const data = await res.json()
        setPaymentError(data.error || 'Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('Payment failed:', error)
      setPaymentError('Payment failed. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelPayment = async () => {
    // Revert the subscription change by canceling
    try {
      await fetch('/api/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: true }),
      })
      // Refresh subscription state
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const result = await res.json()
        setSubscription(result.data?.subscription)
      }
    } catch (error) {
      console.error('Failed to cancel:', error)
    }
    setShowPaymentModal(false)
    setPaymentDetails(null)
    setPaymentError('')
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

  const formatCurrency = (amount: number, currency = 'EUR') =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(amount)

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
                subscription.status === 'PAST_DUE' ? 'bg-yellow-100 text-yellow-800' :
                subscription.status === 'CANCELED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {subscription.status === 'PAST_DUE' ? 'PENDING PAYMENT' : subscription.status}
              </span>
              {subscription.currentPeriodEnd && subscription.status === 'ACTIVE' && (
                <p className="text-sm text-gray-500 mt-1">
                  Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {subscription.currentPeriodEnd && subscription.status === 'CANCELED' && (
                <p className="text-sm text-gray-500 mt-1">
                  Access until: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
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

      {/* Payment Checkout Modal */}
      {showPaymentModal && paymentDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Your Payment</h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Plan</span>
                <span className="font-semibold text-gray-900">{paymentDetails.tier}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Billing</span>
                <span className="font-semibold text-gray-900">
                  {paymentDetails.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}
                </span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(paymentDetails.amount, paymentDetails.currency)}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>

            {paymentError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                {paymentError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirmPayment}
                disabled={updating}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              >
                {updating ? 'Processing...' : `Pay ${formatCurrency(paymentDetails.amount, paymentDetails.currency)}`}
              </button>
              <button
                onClick={handleCancelPayment}
                disabled={updating}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Your subscription will be activated immediately after payment confirmation.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
