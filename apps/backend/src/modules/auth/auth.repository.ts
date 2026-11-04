import { prisma } from '../../config/db.js'
import { hashSessionToken } from '../../lib/session.js'
import { withRetry } from '../../lib/db-retry.js'
import { USER_PUBLIC_FIELDS } from '../users/users.constants.js'

const SESSION_SELECT = {
  id: true,
  userId: true,
  tokenHash: true,
  expiresAt: true,
  revokedAt: true,
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function findUserByIdentifier(identifier: string) {
  return withRetry(() =>
    prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier.toLowerCase() }] },
      select: { passwordHash: true, ...USER_PUBLIC_FIELDS },
    }),
  )
}

export function findActiveSession(token: string) {
  return withRetry(() =>
    prisma.session.findFirst({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, user: { select: { id: true, username: true, email: true, role: true } } },
    }),
  )
}

/** Session creation and the login-history row live or die together. */
export function createSessionWithHistory(params: {
  user: { id: string }
  token: string
  ip: string | null
  userAgent: string | null
}) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  return prisma.$transaction([
    prisma.session.create({
      data: {
        userId: params.user.id,
        tokenHash: hashSessionToken(params.token),
        ip: params.ip,
        userAgent: params.userAgent,
        expiresAt,
      },
    }),
    prisma.loginHistory.create({
      data: { userId: params.user.id, ip: params.ip, userAgent: params.userAgent },
    }),
  ])
}

export function revokeSession(token: string) {
  return prisma.session.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export function revokeAllSessionsForUser(userId: string, exceptSessionId?: string) {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  })
}

export function listSessionsForUser(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { ...SESSION_SELECT, userAgent: true, ip: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export function countActiveSessionsForUser(userId: string) {
  return prisma.session.count({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } } })
}

export function findSessionById(id: string, userId: string) {
  return prisma.session.findFirst({
    where: { id, userId, revokedAt: null },
    select: SESSION_SELECT,
  })
}

export function listLoginHistoryForUser(userId: string, limit = 25) {
  return prisma.loginHistory.findMany({
    where: { userId },
    select: { id: true, ip: true, userAgent: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
