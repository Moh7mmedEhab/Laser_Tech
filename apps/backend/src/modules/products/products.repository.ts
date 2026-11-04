import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../config/db.js'
import { withRetry } from '../../lib/db-retry.js'
import { LOW_STOCK_THRESHOLD } from './products.constants.js'
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './products.validation.js'

const PRODUCT_SELECT = {
  id: true,
  name: true,
  sku: true,
  category: true,
  price: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect

const SORTS: Record<ListProductsQuery['sort'], Prisma.ProductOrderByWithRelationInput> = {
  name: { name: 'asc' },
  price: { price: 'desc' },
  quantity: { quantity: 'asc' },
  newest: { createdAt: 'desc' },
}

export function listProducts(query: ListProductsQuery) {
  const { page, limit, search, category, lowStock, sort } = query
  const where: Prisma.ProductWhereInput = {
    ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
    ...(lowStock ? { quantity: { lt: LOW_STOCK_THRESHOLD } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  return prisma.$transaction([
    prisma.product.findMany({
      where,
      select: PRODUCT_SELECT,
      orderBy: SORTS[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])
}

export function findProductById(id: string) {
  return withRetry(() => prisma.product.findUnique({ where: { id }, select: PRODUCT_SELECT }))
}

export function createProduct(data: CreateProductInput) {
  return prisma.product.create({ data, select: PRODUCT_SELECT })
}

export function updateProduct(id: string, data: UpdateProductInput) {
  return prisma.product.update({ where: { id }, data, select: PRODUCT_SELECT })
}

export function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id }, select: PRODUCT_SELECT })
}

export function listCategories() {
  return prisma.product.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
}
