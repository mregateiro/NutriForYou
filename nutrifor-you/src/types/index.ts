import { UserRole, SubscriptionTier } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      subscriptionTier: SubscriptionTier
      organizationId: string | null
    }
  }

  interface User {
    id: string
    role: UserRole
    subscriptionTier: SubscriptionTier
    organizationId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    subscriptionTier: SubscriptionTier
    organizationId: string | null
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}
