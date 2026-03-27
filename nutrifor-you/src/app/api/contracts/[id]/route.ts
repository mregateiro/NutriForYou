import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getContractById,
  updateContract,
  deleteContract,
  signContract,
  revokeContract,
} from '@/services/contract.service'
import { updateContractSchema, signContractSchema } from '@/validators/contract.schema'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const contract = await getContractById(id, session.user.id)
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    return NextResponse.json({ data: contract })
  } catch (error) {
    logger.error({ error }, 'Failed to get contract')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    // Handle signing
    if (body.action === 'sign') {
      const validation = signContractSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        )
      }
      const contract = await signContract(id, session.user.id, validation.data.signatureData)
      return NextResponse.json({ data: contract })
    }

    // Handle revocation
    if (body.action === 'revoke') {
      const contract = await revokeContract(id, session.user.id)
      return NextResponse.json({ data: contract })
    }

    // Regular update
    const validation = updateContractSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const contract = await updateContract(id, session.user.id, validation.data)
    return NextResponse.json({ data: contract })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'Contract not found' || message === 'Contract not found or not available for signing') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message === 'Cannot edit a signed contract' || message === 'Contract has expired' || message === 'Contract is already revoked') {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    logger.error({ error }, 'Failed to update contract')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await deleteContract(id, session.user.id)
    return NextResponse.json({ message: 'Contract deleted' })
  } catch (error) {
    if ((error as Error).message === 'Only draft contracts can be deleted') {
      return NextResponse.json({ error: (error as Error).message }, { status: 409 })
    }
    logger.error({ error }, 'Failed to delete contract')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
