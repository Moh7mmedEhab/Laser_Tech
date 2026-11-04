import type { Request, Response } from 'express'
import type { AuthedRequest } from '../auth/auth.types.js'
import {
  createBillSchema,
  idParamSchema,
  listBillsQuerySchema,
  updateBillSchema,
} from './bills.validation.js'
import * as service from './bills.service.js'

function caller(req: Request) {
  const authed = req as AuthedRequest
  if (!authed.auth) throw new Error('requireAuth middleware missing')
  return authed.auth.user
}

export async function list(req: Request, res: Response) {
  const query = listBillsQuerySchema.parse(req.query)
  const user = caller(req)
  res.json(await service.listBills(query, user.role, user.id))
}

export async function get(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  const user = caller(req)
  res.json({ bill: await service.getBill(id, user.role, user.id) })
}

export async function create(req: Request, res: Response) {
  const input = createBillSchema.parse(req.body)
  const user = caller(req)
  res.status(201).json({ bill: await service.createBill(input, user.id) })
}

export async function update(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  const input = updateBillSchema.parse(req.body)
  res.json({ bill: await service.updateBill(id, input) })
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  await service.deleteBill(id)
  res.status(204).send()
}
