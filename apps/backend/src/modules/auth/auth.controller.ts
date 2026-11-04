import type { Request, Response } from 'express'
import { AppError } from '../../errors/app.errors.js'
import { SESSION_COOKIE } from './auth.constants.js'
import * as service from './auth.service.js'
import {
  changePasswordSchema,
  loginSchema,
  revokeSessionSchema,
  updateSelfSchema,
} from './auth.validation.js'
import type { AuthedRequest } from './auth.types.js'
import * as userService from '../users/users.service.js'

function clientMeta(req: Request) {
  return { ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.parse(req.body)
  const result = await service.login(parsed, clientMeta(req))

  res.cookie(SESSION_COOKIE, result.token, service.sessionCookieOptions())
  res.status(201).json({ user: result.user })
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined
  await service.logout(token)

  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
}

export function me(req: Request, res: Response) {
  const authed = req as AuthedRequest
  res.json({ user: authed.auth?.user })
}

export async function updateMe(req: Request, res: Response) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')

  const parsed = updateSelfSchema.parse(req.body)
  res.json({ user: await userService.updateUser(authed.auth.user.id, parsed) })
}

export async function changePassword(req: Request, res: Response) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')

  const parsed = changePasswordSchema.parse(req.body)
  await service.changePassword(authed.auth.sessionId, authed.auth.user.id, parsed.currentPassword, parsed.newPassword)

  // The used session stays valid; every other device was force-logged-out.
  res.json({ ok: true })
}

export async function listSessions(req: Request, res: Response) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined

  res.json({ sessions: await service.listSessions(token, authed.auth.sessionId, authed.auth.user.id) })
}

export async function revokeAllOtherSessions(req: Request, res: Response) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined

  await service.revokeAllOtherSessions(token, authed.auth.sessionId, authed.auth.user.id)
  res.json({ ok: true })
}

export async function revokeOneSession(req: Request, res: Response) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
  const { id } = revokeSessionSchema.parse(req.params)

  res.json(await service.revokeOneSession(authed.auth.user.id, id, authed.auth.sessionId))
}

export async function loginHistory(req: Request, res: Response) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined

  res.json({
    history: await service.loginHistory(token, authed.auth.sessionId, authed.auth.user.id),
  })
}
