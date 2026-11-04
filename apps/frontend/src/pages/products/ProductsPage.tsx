import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { LOW_STOCK_THRESHOLD, type Product } from '@/data/types'
import { createProduct, deleteProduct, productStore, updateProduct, useResource } from '@/api/data'
import { formatEGP } from '../../../utils/format'
import { Button, StatusPill } from '@/components/ui/Form'
import { LoadingDots } from '@/components/ui/Loading'
import { FilterBar, SortTh, type FilterValues } from '@/components/ui/FilterBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProductModal } from './ProductModal'
import { ProductActionsMenu } from './ProductActionsMenu'

const PAGE_SIZE = 8

const emptyProduct = (): Product => ({
  id: '',
  name: '',
  sku: '',
  category: 'Laser Tubes',
  price: 0,
  quantity: 0,
  createdAt: '',
  updatedAt: '',
})

const stockStatus = (q: number) =>
  q === 0
    ? { tone: 'error' as const, label: 'Out of stock' }
    : q < LOW_STOCK_THRESHOLD
      ? { tone: 'warning' as const, label: 'Low stock' }
      : { tone: 'success' as const, label: 'In stock' }

/** Column-header sort mapping: UI field → server `sort` value. */
const SORT_FIELDS = { name: 'name', price: 'price', quantity: 'quantity', createdAt: 'newest' } as const

export function ProductsPage() {
  const { data: products, status, error, refresh } = useResource(productStore)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [busy, setBusy] = useState<'' | 'save' | 'delete'>('')
  const [actionError, setActionError] = useState('')
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterValues>({})
  const [sort, setSort] = useState<{ field: string | null; dir: 'asc' | 'desc' }>({
    field: null,
    dir: 'asc',
  })

  // Column-header field → server `sort` value.

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  )

  // Server does the filtering + sorting; pagination stays client-side over
  // the returned (≤100 rows) window.
  useEffect(() => {
    productStore.setParams({
      search: filters.search,
      category: filters.category,
      lowStock: filters.lowStock === 'true' ? 'true' : undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      from: filters.from,
      to: filters.to,
      sort: sort.field ? SORT_FIELDS[sort.field as keyof typeof SORT_FIELDS] : undefined,
      order: sort.field ? sort.dir : undefined,
    })
    void productStore.ensure()
  }, [filters, sort])

  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const lowStockCount = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD).length

  /** Click cycles asc → desc → server default. */
  const onSort = (field: string, dir: 'asc' | 'desc') => {
    if (sort.field === field && sort.dir === 'desc') setSort({ field: null, dir: 'asc' })
    else setSort({ field, dir })
    setPage(1)
  }

  const openCreate = () => {
    setEditing(emptyProduct())
    setFormOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setFormOpen(true)
    setMenuRow(null)
  }

  /** Create or update via the API, then reconcile the store. */
  const save = async (product: Product) => {
    setBusy('save')
    setActionError('')
    try {
      const { id, createdAt: _c, updatedAt: _u, ...data } = product
      const saved = id
        ? await updateProduct(product.id, data)
        : await createProduct(data)
      productStore.upsert(saved)
      setFormOpen(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the product')
    } finally {
      setBusy('')
    }
  }

  const remove = async (product: Product) => {
    setBusy('delete')
    setActionError('')
    try {
      await deleteProduct(product.id)
      productStore.remove(product.id)
      setDeleting(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the product')
      setDeleting(null)
    } finally {
      setBusy('')
    }
  }

  if (status === 'error' && products.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-semibold text-ink">Couldn't load products</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <Button className="mt-4" onClick={refresh}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Products</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            {status === 'loading' ? <LoadingDots /> : <>{products.length} products ·</>}{' '}
            <span className="font-medium text-warning">{lowStockCount} low on stock</span>
          </p>
        </div>
        <Button onClick={openCreate} disabled={busy === 'save'}>
          <Plus size={16} /> Add product
        </Button>
      </header>

      {actionError && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{actionError}</p>
      )}
      {status === 'loading' && products.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <LoadingDots /> Refreshing data…
        </p>
      )}

      <div className="rounded-card bg-surface shadow-card">
        <FilterBar
          filters={[
            { key: 'search', type: 'text', label: 'Product', placeholder: 'Search name, SKU or category' },
            { key: 'category', type: 'select', label: 'Category', options: categories.map((c) => ({ value: c, label: c })) },
            { key: 'lowStock', type: 'select', label: 'Stock', options: [{ value: 'true', label: 'Low stock only (<10)' }] },
            { key: 'minPrice', type: 'number', label: 'Min price (EGP)', placeholder: '0' },
            { key: 'maxPrice', type: 'number', label: 'Max price (EGP)', placeholder: '∞' },
            { key: 'from', type: 'date', label: 'Added from' },
            { key: 'to', type: 'date', label: 'Added to' },
          ]}
          values={filters}
          onChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }))
            setPage(1)
          }}
          onReset={() => {
            setFilters({})
            setPage(1)
          }}
        />

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-muted">
              <SortTh label="Product" field="name" activeField={sort.field ?? ''} activeDir={sort.dir} onSort={onSort} />
              <th className="px-4 py-3">Category</th>
              <SortTh label="Price" field="price" activeField={sort.field ?? ''} activeDir={sort.dir} onSort={onSort} />
              <SortTh label="Quantity" field="quantity" activeField={sort.field ?? ''} activeDir={sort.dir} onSort={onSort} />
              <th className="px-4 py-3">Status</th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const status = stockStatus(p.quantity)
              const low = p.quantity < LOW_STOCK_THRESHOLD
              return (
                <tr
                  key={p.id}
                  className={`relative border-b border-line transition-colors hover:bg-canvas/70 ${
                    low ? 'bg-warning-bg/60' : ''
                  }`}
                >
                  <td className="px-4 py-3.5">
                    {low && <span className="absolute inset-y-0 left-0 w-1 rounded-full bg-warning" />}
                    <div>
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-muted">{p.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted">{p.category}</td>
                  <td className="px-4 py-3.5 font-medium text-ink">{formatEGP(p.price)}</td>
                  <td className="px-4 py-3.5">
                    <span className={low ? 'font-semibold text-warning' : 'text-ink'}>{p.quantity}</span>
                    {low && <span className="ml-2 text-xs text-warning">restock soon</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill tone={status.tone} label={status.label} />
                  </td>
                  <td className="relative px-4 py-3.5">
                    <button
                      onClick={() => setMenuRow(menuRow === p.id ? null : p.id)}
                      className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {menuRow === p.id && (
                      <ProductActionsMenu
                        onEdit={() => openEdit(p)}
                        onDelete={() => {
                          setDeleting(p)
                          setMenuRow(null)
                        }}
                        onClose={() => setMenuRow(null)}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {status === 'loading' ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <LoadingDots /> Loading
                    </span>
                  ) : (
                    'No products match the filters'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between p-4 text-sm text-muted">
          <span>Showing {visible.length} of {products.length} products</span>
          <div className="flex items-center gap-1.5">
            <button
              className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
            >
              Prev
            </button>
            <span className="px-2 font-medium text-ink">{safePage} / {pageCount}</span>
            <button
              className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              disabled={safePage === pageCount}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {formOpen && editing && (
        <ProductModal product={editing} onSave={save} onClose={() => setFormOpen(false)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete “${deleting.name}” permanently? This cannot be undone.`}
          onConfirm={() => void remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
