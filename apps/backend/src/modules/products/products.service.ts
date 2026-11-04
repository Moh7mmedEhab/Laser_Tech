import { mapPrismaKnownError } from '../../lib/prisma-errors.js'
import { notFound } from '../../errors/app.errors.js'
import { LOW_STOCK_THRESHOLD } from './products.constants.js'
import * as repo from './products.repository.js'
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './products.validation.js'

/** DECIMAL(12,2) columns come back as Prisma Decimal; the API speaks numbers. */
function toMoney<T extends { price: unknown }>(product: T): T & { price: number } {
  return { ...product, price: Number(product.price) }
}

export async function listProducts(query: ListProductsQuery) {
  const [rows, total] = await repo.listProducts(query)
  return { products: rows.map(toMoney), total, lowStockThreshold: LOW_STOCK_THRESHOLD }
}

export async function getProduct(id: string) {
  const product = await repo.findProductById(id)
  if (!product) throw notFound('Product')
  return toMoney(product)
}

export async function createProduct(input: CreateProductInput) {
  try {
    return toMoney(await repo.createProduct(input))
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'product SKU' })
  }
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await getProduct(id) // notFound guard before the unique-constraint.mapper
  try {
    return toMoney(await repo.updateProduct(id, input))
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'product SKU' })
  }
}

export async function deleteProduct(id: string) {
  const product = await repo.findProductById(id)
  if (!product) throw notFound('Product')
  try {
    return await repo.deleteProduct(id)
  } catch (err) {
    // P2003 → bill items still reference the product; keep history intact.
    throw mapPrismaKnownError(err, { entity: 'product' })
  }
}

export async function listCategories() {
  const rows = await repo.listCategories()
  return rows.map((r) => r.category)
}
