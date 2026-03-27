import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPatientById, updatePatient, deletePatient } from '@/services/patient.service'
import { updatePatientSchema } from '@/validators/patient.schema'
import { logger } from '@/lib/logger'

// GET — get patient by ID
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const patient = await getPatientById(params.id, session.user.id)

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    return NextResponse.json({ data: patient })
  } catch (error) {
    logger.error({ error }, 'Failed to get patient')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — update patient
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = updatePatientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const patient = await updatePatient(params.id, session.user.id, validation.data)
    return NextResponse.json({ data: patient })
  } catch (error) {
    if ((error as Error).message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update patient')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — soft delete patient
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await deletePatient(params.id, session.user.id)
    return NextResponse.json({ message: 'Patient deleted' })
  } catch (error) {
    if ((error as Error).message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to delete patient')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
