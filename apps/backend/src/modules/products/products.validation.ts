import { z } from 'zod'

const nameSchema = z.string().trim().min(1).max(80)
const skuSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/, 'SKU can only contain letters, digits, dots, dashes, underscores')
  .transform((s) => s.toUpperCase())
const categorySchema = z.string().trim().min(1).max(40)
/** Two decimals max; stored as DECIMAL(12,2). */
const priceSchema = z
  .number()
  .min(0)
  .max(9_999_999_999)
  .refine((n) => Number.isInteger(n * 100), 'Price supports 2 decimal places at most')
const quantitySchema = z.number().int().min(0)

export const createProductSchema = z
  .object({
    name: nameSchema,
    sku: skuSchema,
    category: categorySchema.prefault('General'),
    price: priceSchema,
    quantity: quantitySchema.prefault(0),
  })
  .strict()

export const updateProductSchema = createProductSchema.partial()

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(60).optional(),
    category: z.string().trim().min(1).max(40).optional(),
    lowStock: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    sort: z.enum(['name', 'price', 'quantity', 'newest']).default('name'),
  })
  .strict()

export const idParamSchema = z.object({ id: z.cuid() })

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
