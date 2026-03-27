import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/validators/auth.schema'
import { createAuditLog } from '@/services/audit.service'
import { AuditAction } from '@prisma/client'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password } = validation.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        role: 'NUTRITIONIST',
        subscriptionTier: 'TRIAL',
      },
    })

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
    })

    logger.info({ userId: user.id, email: user.email }, 'New user registered')

    return NextResponse.json(
      { message: 'Account created successfully', userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ error }, 'Registration failed')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
