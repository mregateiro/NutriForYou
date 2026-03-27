import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTemplate, listTemplates } from '@/services/consultation.service'
import { createTemplateSchema } from '@/validators/consultation.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const templates = await listTemplates(session.user.id)
    return NextResponse.json({ data: templates })
  } catch (error) {
    logger.error({ error }, 'Failed to list templates')
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
    const validation = createTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const template = await createTemplate(session.user.id, validation.data)
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create template')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
