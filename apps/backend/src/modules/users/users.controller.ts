import type { Request, Response } from 'express'
import type { AuthedRequest } from '../auth/auth.types.js'
import {
  createUserSchema,
  deleteUserSchema,
  idParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from './users.validation.js'
import * as service from './users.service.js'

function requireAdmin(req: Request) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new Error('requireAuth middleware missing')
  return authed.auth.user
}

export async function list(req: Request, res: Response) {
  const query = listUsersQuerySchema.parse(req.query)
  res.json(await service.listUsers(query))
}

export async function get(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  res.json({ user: await service.getUser(id) })
}

export async function create(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body)
  res.status(201).json({ user: await service.createUser(input) })
}

export async function update(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  const input = updateUserSchema.parse(req.body)
  res.json({ user: await service.updateUser(id, input) })
}

export async function remove(req: Request, res: Response) {
  const callerId = requireAdmin(req).id
  const { id } = idParamSchema.parse(req.params)
  const { password } = deleteUserSchema.parse(req.body)

  await service.deleteUser(id, callerId, password)
  res.status(204).send()
}
