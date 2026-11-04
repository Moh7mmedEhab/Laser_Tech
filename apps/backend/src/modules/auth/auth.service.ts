import bcrypt from 'bcryptjs'
import { prisma } from '../../config/db.js'
import { env } from '../../config/env.js'
import { notFound } from '../../errors/app.errors.js'
import { generateSessionToken } from '../../lib/session.js'
import {
  invalidCredentials,
  sessionExpired,
  sessionsNotFound,
  wrongPassword,
} from './auth.errors.js'
import { DUMMY_BCRYPT_HASH, SESSION_TTL_DAYS } from './auth.constants.js'
import type { LoginInput } from './auth.validation.js'
import * as repo from './auth.repository.js'

const BCRYPT_ROUNDS = 10

/** Passwords are never stored in plaintext: hash on create, compare on login. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export type SessionCookieOptions = {
  httpOnly: true
  sameSite: 'lax'
  secure: boolean
  path: '/'
  maxAge: number
}

export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  }
}

/**
 * Constant-ish time login for unknown identifiers: the dummy bcrypt compare
 * burns the same CPU work as a real compare, defeating user-enumeration timing.
 */
export async function login(
  input: LoginInput,
  meta: { ip: string | null; userAgent: string | null },
) {
  const user = await repo.findUserByIdentifier(input.identifier)
  const hash = user?.passwordHash ?? DUMMY_BCRYPT_HASH
  const ok = await verifyPassword(input.password, hash)

  if (!user || !ok) {
    throw invalidCredentials()
  }

  const token = generateSessionToken()
  await repo.createSessionWithHistory({ user, token, ip: meta.ip, userAgent: meta.userAgent })
  const { passwordHash: _passwordHash, ...publicUser } = user
  return { token, user: publicUser }
}

export async function logout(token: string | undefined) {
  if (!token) return
  await repo.revokeSession(token)
}

export async function currentSession(token: string | undefined, sessionId: string) {
  if (!token) throw sessionExpired()
  const session = await repo.findActiveSession(token)
  if (!session || session.id !== sessionId) throw sessionExpired()
  return session
}

export async function listSessions(token: string | undefined, sessionId: string, userId: string) {
  await currentSession(token, sessionId)
  const sessions = await repo.listSessionsForUser(userId)
  // `current` lets the UI mark the row "this device" and skip its own logout button.
  return sessions.map((s) => ({ ...s, current: s.id === sessionId }))
}

export async function revokeOneSession(
  userId: string,
  requestedSessionId: string,
  sessionId: string,
) {
  const session = await repo.findSessionById(requestedSessionId, userId)
  if (!session) throw sessionsNotFound()

  await prisma.session.update({
    where: { id: requestedSessionId },
    data: { revokedAt: new Date() },
  })
  return { revokedSelf: requestedSessionId === sessionId }
}

export async function revokeAllOtherSessions(
  token: string | undefined,
  sessionId: string,
  userId: string,
) {
  await currentSession(token, sessionId)
  await repo.revokeAllSessionsForUser(userId, sessionId)
}

export async function loginHistory(token: string | undefined, sessionId: string, userId: string) {
  await currentSession(token, sessionId)
  return repo.listLoginHistoryForUser(userId)
}

/**
 * Change password: verifies the current password, then rotates the hash and
 * revokes every other session so stolen cookies die with the old password.
 */
export async function changePassword(
  sessionId: string,
  userId: string,
  currentPlain: string,
  nextPlain: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user) throw notFound('User')

  const ok = await verifyPassword(currentPlain, user.passwordHash)
  if (!ok) throw wrongPassword()

  const passwordHash = await hashPassword(nextPlain)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    repo.revokeAllSessionsForUser(userId, sessionId),
  ])
}
