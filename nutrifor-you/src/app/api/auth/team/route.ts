import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getServerSession } from 'next-auth'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createAuditLog } from '@/services/audit.service'
import { AuditAction } from '@prisma/client'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const addTeamMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['NUTRITIONIST', 'ADMIN']).default('NUTRITIONIST'),
})

// GET — list team members
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Not part of an organization' }, { status: 403 })
  }

  const members = await prisma.user.findMany({
    where: {
      organizationId: session.user.organizationId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: members })
}

// POST — add team member
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Not part of an organization' }, { status: 403 })
  }

  // Only BUSINESS tier can manage team
  if (session.user.subscriptionTier !== 'BUSINESS') {
    return NextResponse.json(
      { error: 'Team management requires Business plan' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const validation = addTeamMemberSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, firstName, lastName, role } = validation.data

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Create team member with cryptographically secure temporary password
    const tempPassword = randomBytes(16).toString('base64url')
    const passwordHash = await hash(tempPassword, 12)

    const member = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        role,
        organizationId: session.user.organizationId,
        subscriptionTier: 'BUSINESS',
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATE,
      entity: 'TeamMember',
      entityId: member.id,
      details: { email: member.email, role: member.role },
    })

    logger.info(
      { memberId: member.id, addedBy: session.user.id },
      'Team member added'
    )

    // TODO: Send invitation email with temp password

    return NextResponse.json(
      { message: 'Team member added', memberId: member.id },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ error }, 'Failed to add team member')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
