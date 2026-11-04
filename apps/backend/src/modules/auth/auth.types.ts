import type { Request } from 'express'

export type Role = 'ADMIN' | 'USER' | 'EMPLOYEE'

/** Safe user payload used in responses after password stripping. */
export type PublicUser = {
  id: string
  username: string
  email: string
  phone: string
  role: Role
  createdAt: string
  updatedAt: string
}

export type LoginResult = {
  token: string
  user: PublicUser
}

export type SessionRow = {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  current: boolean
}

export type LoginHistoryRow = {
  id: string
  ip: string | null
  userAgent: string | null
  createdAt: string
}

/** Request context filled by the requireAuth middleware. */
export type AuthedRequest = Request & {
  auth?: {
    user: { id: string; username: string; email: string; role: Role }
    sessionId: string
  }
}
