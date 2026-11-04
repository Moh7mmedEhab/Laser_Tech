import { useEffect, useSyncExternalStore, useCallback } from 'react'
import { api } from '@/api/client'
import { getSocket } from '@/api/socket'
import type { Product, Bill, ApiUser, Note, Role, BillItemInput } from '@/data/types'

/** Every cached row carries a CUID id. */
export type ApiRow = { id: string }

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ResourceSnapshot<T> = {
  data: T[]
  total: number
  status: ResourceStatus
  error: string | null
}

/**
 * Cache-one-collection store per resource: subscribable, refetchable, and
 * invalidated by Socket.IO domain events. `useSyncExternalStore` keeps the
 * subscription/refetch contract outside React state so lint rules about
 * setState-in-effect never apply.
 */
class ResourceStore<T extends ApiRow> {
  private listeners = new Set<() => void>()
  private version = 0
  private snapshot: ResourceSnapshot<T> & { fetchedAt: number; version: number } = {
    data: [],
    total: 0,
    status: 'idle',
    error: null,
    fetchedAt: 0,
    version: 0,
  }

  constructor(name: string, list: () => Promise<{ rows: T[]; total: number }>) {
    this.name = name
    this.list = list
  }

  readonly name: string
  private readonly list

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  private patch(next: Partial<ResourceSnapshot<T> & { fetchedAt: number; version: number }>) {
    this.snapshot = { ...this.snapshot, ...next }
    for (const listener of this.listeners) listener()
  }

  load = async () => {
    this.patch({ status: 'loading', error: null })
    try {
      const { rows, total } = await this.list()
      this.patch({
        data: rows,
        total,
        status: 'ready',
        fetchedAt: Date.now(),
        version: (this.version += 1),
      })
    } catch (err) {
      this.patch({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load',
        version: (this.version += 1),
      })
    }
  }

  /** Called from component effects; fetches when there is no fresh data. */
  ensure = async () => {
    const { status, fetchedAt, data } = this.snapshot
    if (status === 'ready' && data.length > 0 && Date.now() - fetchedAt < 15_000) return
    if (status === 'loading') return
    await this.load()
  }

  /** Socket event hook: refresh in the background. */
  invalidate = async () => {
    if (this.snapshot.status === 'idle') return
    await this.load()
  }

  /** Apply a server-mutated row until the refetch lands. */
  upsert = (row: T) => {
    const exists = this.snapshot.data.some((item) => item.id === row.id)
    this.patch({
      data: exists
        ? this.snapshot.data.map((item) => (item.id === row.id ? row : item))
        : [row, ...this.snapshot.data],
      total: exists ? this.snapshot.total : this.snapshot.total + 1,
    })
  }

  remove = (id: string) => {
    this.patch({
      data: this.snapshot.data.filter((item) => item.id !== id),
      total: Math.max(0, this.snapshot.total - 1),
    })
  }
}

// ---- module stores (one per collection, shared across every page mount) ----

export const productStore = new ResourceStore<Product>('products', async () => {
  const res = await api.get<{ products: Product[]; total: number }>('/products?limit=100')
  return { rows: res.products, total: res.total }
})

export const billStore = new ResourceStore<Bill>('bills', async () => {
  const res = await api.get<{ bills: Bill[]; total: number }>('/bills?limit=100')
  return { rows: res.bills, total: res.total }
})

export const userStore = new ResourceStore<ApiUser>('users', async () => {
  const res = await api.get<{ users: ApiUser[]; total: number }>('/users?limit=100')
  return { rows: res.users, total: res.total }
})

export const noteStore = new ResourceStore<Note>('notes', async () => {
  const res = await api.get<{ notes: Note[]; total: number }>('/notes?limit=100')
  return { rows: res.notes, total: res.total }
})

// Socket.IO domain events → store invalidation. Bills touch product stock, so
// the products store refreshes alongside them.
type Invalidatable = { invalidate: () => Promise<void> }
const invalidations: Record<string, { stores: Invalidatable[] }> = {
  'product:changed': { stores: [productStore] },
  'bill:created': { stores: [billStore, productStore] },
  'bill:updated': { stores: [billStore, productStore] },
  'bill:deleted': { stores: [billStore, productStore] },
  'note:created': { stores: [noteStore] },
  'note:updated': { stores: [noteStore] },
  'note:deleted': { stores: [noteStore] },
}

/** Bind once per Socket.IO connection; safe to call after every login. */
let boundSocket: NonNullable<ReturnType<typeof getSocket>> | undefined
export function bindRealtimeInvalidations() {
  const sock = getSocket()
  if (!sock || sock === boundSocket) return
  boundSocket = sock
  for (const [event, { stores }] of Object.entries(invalidations)) {
    sock.on(event, () => {
      for (const store of stores) void store.invalidate()
    })
  }
}

// ---- typed command functions (API mutations + cache reconciliation) ----

export type ProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>

export const createProduct = (data: ProductPayload) =>
  api.post<{ product: Product }>('/products', data).then((r) => r.product)
export const updateProduct = (id: string, data: Partial<ProductPayload>) =>
  api.patch<{ product: Product }>(`/products/${id}`, data).then((r) => r.product)
export const deleteProduct = (id: string) => api.del(`/products/${id}`)

export const createBill = (data: { userId: string; notes?: string | null; items: BillItemInput[] }) =>
  api.post<{ bill: Bill }>('/bills', data).then((r) => r.bill)
export const updateBill = (
  id: string,
  data: { userId?: string; notes?: string | null; items?: BillItemInput[] },
) => api.patch<{ bill: Bill }>(`/bills/${id}`, data).then((r) => r.bill)
export const deleteBill = (id: string) => api.del(`/bills/${id}`)

export const createUser = (data: {
  username: string
  email: string
  phone: string
  password: string
  role: Role
}) => api.post<{ user: ApiUser }>('/users', data).then((r) => r.user)
export const updateUser = (id: string, data: Partial<Omit<ApiUser, 'id'> & { password: string }>) =>
  api.patch<{ user: ApiUser }>(`/users/${id}`, data).then((r) => r.user)
export const deleteUser = (id: string) => api.del(`/users/${id}`)

export const createNote = (data: { content: string; amount?: number | null; userId?: string | null }) =>
  api.post<{ note: Note }>('/notes', { userId: null, ...data })
    .then((r) => r.note)
export const updateNote = (
  id: string,
  data: { content?: string; amount?: number | null; userId?: string | null },
) => api.patch<{ note: Note }>(`/notes/${id}`, data).then((r) => r.note)
export const deleteNote = (id: string) => api.del(`/notes/${id}`)

/** Never-throws hook: exposes data/total/status/error + a manual refresh. */
export function useResource<T extends ApiRow>(store: ResourceStore<T>) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  useEffect(() => {
    void store.ensure()
    // Re-run whenever an invalidation/refetch bumps the version.
  }, [store, snapshot.version])

  const refresh = useCallback(() => void store.load(), [store])
  return { ...snapshot, refresh }
}
