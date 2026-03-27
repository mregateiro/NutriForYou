import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/validators/auth.schema'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = forgotPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email } = validation.data
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If the email exists, a reset link has been sent' })
    }

    // Generate token
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
      },
    })

    // TODO: Send email with reset link
    // In development, log the token
    logger.info(
      { email, resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}` },
      'Password reset requested'
    )

    return NextResponse.json({ message: 'If the email exists, a reset link has been sent' })
  } catch (error) {
    logger.error({ error }, 'Forgot password failed')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
