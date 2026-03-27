import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listEmailTemplates, createEmailTemplate } from '@/services/marketing.service'
import { createEmailTemplateSchema } from '@/validators/marketing.schema'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const templates = await listEmailTemplates()
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
    const input = createEmailTemplateSchema.parse(body)
    const template = await createEmailTemplate(session.user.id, input)
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create template')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
