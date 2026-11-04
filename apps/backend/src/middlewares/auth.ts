import type { NextFunction, Request, Response } from 'express'
import { forbidden, unauthorized } from '../errors/app.errors.js'
import { sessionExpired } from '../modules/auth/auth.errors.js'
import { SESSION_COOKIE } from '../modules/auth/auth.constants.js'
import * as authRepo from '../modules/auth/auth.repository.js'
import type { AuthedRequest, Role } from '../modules/auth/auth.types.js'

/**
 * Opaque-token session auth: the cookie only carries a random token, the DB
 * row (hashed) is the source of truth, so any session can be revoked instantly.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined
    if (!token) throw unauthorized()

    const session = await authRepo.findActiveSession(token)
    if (!session) throw sessionExpired()

    const authed = req as AuthedRequest
    authed.auth = {
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role as Role,
      },
      sessionId: session.id,
    }
    next()
  } catch (err) {
    next(err)
  }
}

/** Role gate to chain after requireAuth, e.g. requireRole('ADMIN'). */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authed = req as AuthedRequest
    if (!authed.auth || !roles.includes(authed.auth.user.role)) {
      next(forbidden())
      return
    }
    next()
  }
}
