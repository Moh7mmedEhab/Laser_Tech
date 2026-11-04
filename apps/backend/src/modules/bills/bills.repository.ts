import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../config/db.js'
import type { ListBillsQuery } from './bills.validation.js'

/**
 * Shape every bill response uses: items include productId/quantity so services
 * can restock, plus resolved usernames for the owner and the issuing admin.
 */
export const BILL_INCLUDE = {
  items: true,
  user: { select: { id: true, username: true } },
  admin: { select: { id: true, username: true } },
} as const

const SORTS: Record<ListBillsQuery['sort'], Prisma.BillOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  amount: { amount: 'desc' },
}

export function listBills(query: ListBillsQuery) {
  const { page, limit, userId, search, from, to, sort } = query
  const where: Prisma.BillWhereInput = {
    ...(userId ? { userId } : {}),
    ...(from || to
      ? { createdAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined } }
      : {}),
    ...(search
      ? {
          OR: [
            { user: { username: { contains: search, mode: 'insensitive' } } },
            { items: { some: { product: { sku: { contains: search, mode: 'insensitive' } } } } },
            { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
          ],
        }
      : {}),
  }

  return prisma.$transaction([
    prisma.bill.findMany({
      where,
      include: BILL_INCLUDE,
      orderBy: SORTS[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bill.count({ where }),
  ])
}

export function findBillById(id: string) {
  return prisma.bill.findUnique({ where: { id }, include: BILL_INCLUDE })
}

export function deleteBill(id: string) {
  return prisma.bill.delete({ where: { id } })
}
