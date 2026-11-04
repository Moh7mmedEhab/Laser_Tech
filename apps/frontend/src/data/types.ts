/**
 * Live API contract types (mirrors the Prisma schema / Express responses).
 * Kept under `@/data/types` so every page import stays valid — the mock
 * entities these replaced are gone (see README "Wired to the API").
 */

export type Role = 'ADMIN' | 'USER' | 'EMPLOYEE'

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  EMPLOYEE: 'Technician',
  USER: 'Client',
}
export const roleLabel = (role: Role) => ROLE_LABELS[role]

export const ROLE_OPTIONS: { value: Role; label: string }[] = (
  Object.keys(ROLE_LABELS) as Role[]
).map((value) => ({ value, label: ROLE_LABELS[value] }))

export const SESSION_COOKIE = 'lt_session'

export type ApiUser = {
  id: string
  username: string
  email: string
  phone: string
  role: Role
  createdAt: string
  updatedAt: string
  /** Populated by the users list endpoint. */
  billCount?: number
  /** Bills/note counts feed the delete-confirmation dialog. */
  noteCount?: number
}

export type ApiMe = Pick<ApiUser, 'id' | 'username' | 'email' | 'role'> & { phone?: string }

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  price: number
  quantity: number
  createdAt: string
  updatedAt: string
}

export type BillPerson = { id: string; username: string }

export type BillItem = {
  id: string
  productId: string
  quantity: number
  unitPrice: number
}

export type Bill = {
  id: string
  notes: string | null
  amount: number
  createdAt: string
  updatedAt: string
  user: BillPerson
  admin: BillPerson
  items: BillItem[]
}

export type BillItemInput = { productId: string; quantity: number }

export type Note = {
  id: string
  content: string
  amount: number | null
  createdAt: string
  updatedAt: string
  admin: BillPerson
  user: BillPerson | null
}

/** Rows below this quantity are flagged as low stock in Products. */
export const LOW_STOCK_THRESHOLD = 10
