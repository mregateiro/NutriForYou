import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSubscription, changeSubscription, cancelSubscription, confirmSubscriptionPayment, PRICING } from '@/services/subscription.service'
import { changeSubscriptionSchema, cancelSubscriptionSchema, confirmPaymentSchema } from '@/validators/subscription.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subscription = await getSubscription(session.user.id)
    return NextResponse.json({ data: { subscription, pricing: PRICING } })
  } catch (error) {
    logger.error({ error }, 'Failed to get subscription')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    // If this is a payment confirmation request
    if (body.action === 'confirm_payment') {
      const validation = confirmPaymentSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        )
      }

      const subscription = await confirmSubscriptionPayment(
        session.user.id,
        validation.data.paymentMethod
      )
      return NextResponse.json({ data: subscription })
    }

    // Otherwise, initiate a subscription change (sets PAST_DUE status)
    const validation = changeSubscriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const tierKey = validation.data.tier as keyof typeof PRICING
    const price = PRICING[tierKey]
    const amount = validation.data.billingCycle === 'ANNUAL' ? price.annual : price.monthly

    const subscription = await changeSubscription(session.user.id, validation.data)
    return NextResponse.json({
      data: subscription,
      requiresPayment: true,
      paymentDetails: {
        amount,
        currency: price.currency,
        tier: validation.data.tier,
        billingCycle: validation.data.billingCycle,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Failed to change subscription')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = cancelSubscriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const subscription = await cancelSubscription(
      session.user.id,
      validation.data.reason,
      validation.data.immediate
    )
    return NextResponse.json({ data: subscription })
  } catch (error) {
    logger.error({ error }, 'Failed to cancel subscription')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
