import type { Request, Response } from 'express'
import type { AuthedRequest } from '../auth/auth.types.js'
import {
  createNoteSchema,
  idParamSchema,
  listNotesQuerySchema,
  updateNoteSchema,
} from './notes.validation.js'
import * as service from './notes.service.js'

function caller(req: Request) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new Error('requireAuth middleware missing')
  return authed.auth.user
}

export async function list(req: Request, res: Response) {
  const query = listNotesQuerySchema.parse(req.query)
  const user = caller(req)
  res.json(await service.listNotes(query, user.role, user.id))
}

export async function get(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  const user = caller(req)
  res.json({ note: await service.getNote(id, user.role, user.id) })
}

export async function create(req: Request, res: Response) {
  const input = createNoteSchema.parse(req.body)
  const user = caller(req)
  res.status(201).json({ note: await service.createNote(input, user.id) })
}

export async function update(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  const input = updateNoteSchema.parse(req.body)
  const user = caller(req)
  res.json({ note: await service.updateNote(id, input, user.role, user.id) })
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  const user = caller(req)
  await service.deleteNote(id, user.role, user.id)
  res.status(204).send()
}
