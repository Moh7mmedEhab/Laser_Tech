import { z } from 'zod'
import { MAX_ITEMS_PER_BILL } from './bills.constants.js'

/** The client never sends prices: the server snapshots the product's price. */
const itemSchema = z
  .object({
    productId: z.cuid(),
    quantity: z.number().int().min(1).max(9_999),
  })
  .strict()

export const createBillSchema = z
  .object({
    userId: z.cuid(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(itemSchema).min(1).max(MAX_ITEMS_PER_BILL),
  })
  .strict()

export const updateBillSchema = z
  .object({
    userId: z.cuid().optional(),
    notes: z.string().trim().max(500).optional().nullable(),
    items: z.array(itemSchema).min(1).max(MAX_ITEMS_PER_BILL).optional(),
  })
  .strict()

export const listBillsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    userId: z.cuid().optional(),
    adminId: z.cuid().optional(),
    search: z.string().trim().min(1).max(60).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    minAmount: z.coerce.number().min(0).max(9_999_999_999).optional(),
    maxAmount: z.coerce.number().min(0).max(9_999_999_999).optional(),
    sort: z.enum(['newest', 'oldest', 'amount']).default('newest'),
    /** Optional direction override over the server default for `sort`. */
    order: z.enum(['asc', 'desc']).optional(),
  })
  .strict()

export const idParamSchema = z.object({ id: z.cuid() })

export type BillItemInput = z.infer<typeof itemSchema>
export type CreateBillInput = z.infer<typeof createBillSchema>
export type UpdateBillInput = z.infer<typeof updateBillSchema>
export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>
