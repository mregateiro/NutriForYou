import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrganization, updateOrganization } from '@/services/organization.service'
import { updateOrganizationSchema } from '@/validators/admin.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const org = await getOrganization(session.user.id)
    return NextResponse.json({ data: org })
  } catch (error) {
    logger.error({ error }, 'Failed to get organization')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = updateOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const org = await updateOrganization(session.user.id, validation.data)
    return NextResponse.json({ data: org })
  } catch (error) {
    if ((error as Error).message === 'No organization found') {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }
    logger.error({ error }, 'Failed to update organization')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
