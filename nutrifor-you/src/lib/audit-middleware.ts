import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { AuditAction } from '@prisma/client'
import { createAuditLog } from '@/services/audit.service'

const AUDIT_ROUTES: Record<string, { entity: string; actions: Record<string, AuditAction> }> = {
  '/api/patients': {
    entity: 'Patient',
    actions: { GET: AuditAction.READ, POST: AuditAction.CREATE },
  },
  '/api/consultations': {
    entity: 'Consultation',
    actions: { GET: AuditAction.READ, POST: AuditAction.CREATE },
  },
  '/api/meal-plans': {
    entity: 'MealPlan',
    actions: { GET: AuditAction.READ, POST: AuditAction.CREATE },
  },
  '/api/gdpr/export': {
    entity: 'GDPRExport',
    actions: { POST: AuditAction.EXPORT },
  },
  '/api/gdpr/delete': {
    entity: 'GDPRDelete',
    actions: { POST: AuditAction.DELETE },
  },
}

export async function auditApiRequest(req: NextRequest): Promise<void> {
  const token = await getToken({ req })
  if (!token) return

  const pathname = req.nextUrl.pathname
  const method = req.method

  for (const [route, config] of Object.entries(AUDIT_ROUTES)) {
    if (pathname.startsWith(route)) {
      const action = config.actions[method]
      if (action) {
        const pathParts = pathname.split('/')
        const entityId = pathParts.length > 3 ? pathParts[3] : undefined

        await createAuditLog({
          userId: token.id as string,
          action,
          entity: config.entity,
          entityId,
          details: { method, pathname },
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        })
      }
      break
    }
  }
}
