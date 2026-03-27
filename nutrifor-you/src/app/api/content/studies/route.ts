import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listStudyReferences, createStudyReference } from '@/services/content.service'
import { createStudyReferenceSchema } from '@/validators/content.schema'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const result = await listStudyReferences({
      search: url.searchParams.get('search') || undefined,
      page: Number(url.searchParams.get('page')) || 1,
      perPage: Number(url.searchParams.get('perPage')) || 20,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ error }, 'Failed to list study references')
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
    const input = createStudyReferenceSchema.parse(body)
    const study = await createStudyReference(session.user.id, input)
    return NextResponse.json({ data: study }, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create study reference')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
