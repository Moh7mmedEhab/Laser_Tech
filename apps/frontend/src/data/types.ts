export type Product = {
  id: string
  name: string
  sku: string
  category: string
  price: number
  quantity: number
}

export type BillStatus = 'paid' | 'pending' | 'overdue'

export type Bill = {
  id: string
  client: string
  phone: string
  itemsCount: number
  total: number
  issuedAt: string
  status: BillStatus
}

export type User = {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Technician' | 'Accountant'
  active: boolean
  joinedAt: string
}

export type Note = {
  id: string
  date: string
  title: string
  content: string
  tag: 'Maintenance' | 'Sales' | 'General' | 'Orders'
}

/** Rows below this quantity are flagged as low stock in Products. */
export const LOW_STOCK_THRESHOLD = 10
