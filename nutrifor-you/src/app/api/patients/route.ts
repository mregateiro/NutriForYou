import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPatient, searchPatients } from '@/services/patient.service'
import { createPatientSchema, searchPatientsSchema } from '@/validators/patient.schema'
import { logger } from '@/lib/logger'

// GET — list/search patients
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const params = searchPatientsSchema.parse({
      query: url.searchParams.get('query') || undefined,
      page: url.searchParams.get('page') || 1,
      perPage: url.searchParams.get('perPage') || 20,
      sortBy: url.searchParams.get('sortBy') || 'createdAt',
      sortOrder: url.searchParams.get('sortOrder') || 'desc',
    })

    const result = await searchPatients(session.user.id, params)
    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list patients')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create patient
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = createPatientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const patient = await createPatient(session.user.id, validation.data)
    return NextResponse.json({ data: patient }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create patient')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
