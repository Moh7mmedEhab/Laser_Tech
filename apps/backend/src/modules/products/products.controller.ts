import type { Request, Response } from 'express'
import {
  createProductSchema,
  idParamSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from './products.validation.js'
import * as service from './products.service.js'

export async function list(req: Request, res: Response) {
  const query = listProductsQuerySchema.parse(req.query)
  res.json(await service.listProducts(query))
}

export async function get(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  res.json({ product: await service.getProduct(id) })
}

export async function create(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body)
  res.status(201).json({ product: await service.createProduct(input) })
}

export async function update(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  const input = updateProductSchema.parse(req.body)
  res.json({ product: await service.updateProduct(id, input) })
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params)
  await service.deleteProduct(id)
  res.status(204).send()
}

export async function categories(_req: Request, res: Response) {
  res.json({ categories: await service.listCategories() })
}
