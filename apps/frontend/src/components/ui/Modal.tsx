import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Modal container following the brand card style (12px radius, card shadow). */
export function Modal({
  title,
  onClose,
  children,
  widthClass,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  /** Panel width override, e.g. `max-w-xl` for multi-item forms. */
  widthClass?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card ${widthClass ?? 'max-w-lg'}`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink">
            <X size={18} />
          </button>
        </header>
        {/* Tall forms scroll inside the window instead of overflowing the viewport. */}
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
