import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  const btn =
    'flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-40'

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1.5">
        <button className={`${btn} text-muted hover:bg-canvas`} disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        {pages.slice(0, 7).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${btn} ${p === page ? 'bg-primary text-white' : 'text-muted hover:bg-canvas'}`}
          >
            {p}
          </button>
        ))}
        <button
          className={`${btn} text-muted hover:bg-canvas`}
          disabled={page === pageCount}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
