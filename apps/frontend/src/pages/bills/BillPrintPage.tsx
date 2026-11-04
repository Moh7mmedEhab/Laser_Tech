import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { api } from '@/api/client'
import type { Bill, Product } from '@/data/types'
import { formatEGP, formatDate } from '../../../utils/format'
import logo from '@/assets/logo.svg'

const productName = (productId: string, products: Product[]) =>
  products.find((p) => p.id === productId)?.name ?? productId

/**
 * Standalone print view (route `/bills/:id/print`, no app chrome). Opens in
 * a new tab from the bill row menu and triggers the browser print dialog.
 */
export function BillPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [bill, setBill] = useState<Bill | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    let cancelled = false
    void api
      .get<{ bill: Bill }>(`/bills/${id}`)
      .then(async ({ bill: fetched }) => {
        if (cancelled) return
        const { products: list } = await api.get<{ products: Product[] }>('/products?limit=100')
        if (cancelled) return
        // Give the browser a beat to lay the content out before printing.
        setBill(fetched)
        setProducts(list)
        window.setTimeout(() => window.print(), 300)
      })
      .catch(() => window.close())
    return () => {
      cancelled = true
    }
  }, [id])

  if (!bill) {
    return <div className="p-10 text-sm text-muted">Preparing bill for printing…</div>
  }

  return (
    <div className="mx-auto my-8 max-w-3xl bg-white p-10 text-neutral-900 shadow-lg print:my-0 print:p-0 print:shadow-none">
      <header className="flex items-center justify-between border-b-2 border-indigo-600 pb-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Laser Tech" className="size-10" />
          <div>
            <p className="text-lg font-bold">Laser Tech</p>
            <p className="text-xs text-neutral-500">Laser cutting & engraving supplies</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-indigo-600">BILL</p>
          <p className="text-xs text-neutral-500">{bill.id.slice(-6).toUpperCase()}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase text-neutral-500">Client</p>
          <p className="font-semibold">{bill.user.username}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase text-neutral-500">Issued</p>
          <p className="font-semibold">{formatDate(bill.createdAt)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-neutral-500">Issued by</p>
          <p className="font-semibold">{bill.admin.username}</p>
        </div>
      </section>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-[11px] font-semibold uppercase text-neutral-500">
            <th className="py-2">Product</th>
            <th className="py-2 text-center">Qty</th>
            <th className="py-2 text-right">Unit price</th>
            <th className="py-2 text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-100">
              <td className="py-2">{productName(item.productId, products)}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{formatEGP(item.unitPrice)}</td>
              <td className="py-2 text-right font-medium">
                {formatEGP(item.unitPrice * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 text-right text-[11px] font-semibold uppercase text-neutral-500">
              Total
            </td>
            <td className="pt-3 text-right text-lg font-bold text-indigo-600">{formatEGP(bill.amount)}</td>
          </tr>
        </tfoot>
      </table>

      {bill.notes && (
        <section className="mt-6 rounded-lg bg-neutral-50 p-4 text-sm">
          <p className="text-[11px] font-semibold uppercase text-neutral-500">Notes</p>
          <p className="mt-1">{bill.notes}</p>
        </section>
      )}

      <footer className="mt-10 border-t border-neutral-200 pt-3 text-center text-[11px] text-neutral-400">
        Thank you for your business — Laser Tech · bill {bill.id.slice(-6).toUpperCase()}
      </footer>

      <button
        onClick={() => window.print()}
        className="mt-8 block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 print:hidden"
      >
        Print this bill
      </button>
    </div>
  )
}
