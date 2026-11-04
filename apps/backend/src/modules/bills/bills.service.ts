import { prisma } from '../../config/db.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { forbidden, insufficientStock, notFound } from '../../errors/app.errors.js'
import { mapPrismaKnownError } from '../../lib/prisma-errors.js'
import { emit } from '../../lib/events.js'
import type { Role } from '../auth/auth.types.js'
import * as repo from './bills.repository.js'
import { BILL_INCLUDE } from './bills.repository.js'
import type {
  BillItemInput,
  CreateBillInput,
  ListBillsQuery,
  UpdateBillInput,
} from './bills.validation.js'

/** DECIMAL(12,2) comes back as Prisma Decimal; the API speaks plain numbers. */
function centsOf(price: unknown) {
  return Math.round(Number(price) * 100)
}

function moneyOf(cents: number) {
  return (cents / 100).toFixed(2)
}

/** Prisma include shape shared with the repository (single source of truth). */
type BillWith = Prisma.BillGetPayload<{ include: typeof BILL_INCLUDE }>

function serializeBill(bill: BillWith) {
  return {
    ...bill,
    amount: Number(bill.amount),
    items: bill.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })),
  }
}

/** Same item listed twice collapses into one line with summed quantities. */
export function mergeItems(items: BillItemInput[]) {
  const merged = new Map<string, number>()
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

type ItemLine = { productId: string; quantity: number }

/**
 * Race-safe stock consumption: each decrement is conditional on remaining
 * quantity, so N parallel requests can never oversell the last unit — the
 * loser gets a 409 and the whole transaction rolls back.
 */
async function consumeStock(tx: Prisma.TransactionClient, lines: ItemLine[]) {
  const products = await tx.product.findMany({
    where: { id: { in: lines.map((i) => i.productId) } },
    select: { id: true, sku: true, price: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))

  for (const line of lines) {
    const product = byId.get(line.productId)
    if (!product) throw notFound('Product')

    const consumed = await tx.product.updateMany({
      where: { id: line.productId, quantity: { gte: line.quantity } },
      data: { quantity: { decrement: line.quantity } },
    })
    if (consumed.count === 0) throw insufficientStock(product.sku)
  }

  // Integer cents avoid 0.1 + 0.2 float drift in the stored amount.
  const totalCents = lines.reduce(
    (sum, line) => sum + centsOf(byId.get(line.productId)?.price ?? 0) * line.quantity,
    0,
  )
  return { byId, totalCents }
}

export async function createBill(input: CreateBillInput, adminId: string) {
  try {
    const merged = mergeItems(input.items)

    const bill = await prisma.$transaction(async (tx) => {
      const { byId, totalCents } = await consumeStock(tx, merged)

      const created = await tx.bill.create({
        data: {
          userId: input.userId,
          adminId,
          notes: input.notes ?? null,
          amount: moneyOf(totalCents),
          items: {
            create: merged.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: moneyOf(centsOf(byId.get(line.productId)?.price ?? 0)),
            })),
          },
        },
        include: BILL_INCLUDE,
      })

      emit('bill:created', { billId: created.id, userId: input.userId, amount: totalCents / 100 })
      return created
    })

    return serializeBill(bill)
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'bill' })
  }
}

export async function updateBill(id: string, input: UpdateBillInput) {
  const existing = await repo.findBillById(id)
  if (!existing) throw notFound('Bill')

  if (input.items) {
    const merged = mergeItems(input.items)

    const bill = await prisma.$transaction(async (tx) => {
      // 1. Put every old line back on the shelf, unconditionally.
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        })
      }

      // 2. Re-consume the new lines through the same race-safe path.
      const { byId, totalCents } = await consumeStock(tx, merged)

      // Item edits re-snapshot unit prices at the current catalog price.
      await tx.billItem.deleteMany({ where: { billId: id } })
      await tx.billItem.createMany({
        data: merged.map((line) => ({
          billId: id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: moneyOf(centsOf(byId.get(line.productId)?.price ?? 0)),
        })),
      })

      return tx.bill.update({
        where: { id },
        data: {
          ...(input.userId ? { userId: input.userId } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          amount: moneyOf(totalCents),
        },
        include: BILL_INCLUDE,
      })
    })

    emit('bill:updated', { billId: id })
    return serializeBill(bill)
  }

  // Notes / owner-only changes: no stock implications.
  try {
    const bill = await prisma.bill.update({
      where: { id },
      data: {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: BILL_INCLUDE,
    })
    emit('bill:updated', { billId: id })
    return serializeBill(bill)
  } catch (err) {
    throw mapPrismaKnownError(err, { entity: 'bill' })
  }
}

export async function deleteBill(id: string) {
  const existing = await repo.findBillById(id)
  if (!existing) throw notFound('Bill')

  await prisma.$transaction(async (tx) => {
    // Cancelling a bill puts every product back on the shelf.
    for (const item of existing.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      })
    }
    await repo.deleteBill(id)
  })

  emit('bill:deleted', { billId: id })
}

export async function listBills(query: ListBillsQuery, role: Role, callerId: string) {
  // USER accounts are locked to their own bills; admins/employees see all.
  if (role === 'USER') {
    if (query.userId && query.userId !== callerId) throw forbidden()
    query.userId = callerId
  }
  const [rows, total] = await repo.listBills(query)
  return {
    bills: rows.map(serializeBill),
    total,
  }
}

export async function getBill(id: string, role: Role, callerId: string) {
  const bill = await repo.findBillById(id)
  if (!bill) throw notFound('Bill')
  if (role === 'USER' && bill.user.id !== callerId) throw forbidden()

  return serializeBill(bill)
}
