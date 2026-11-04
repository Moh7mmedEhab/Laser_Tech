import { ChevronDown, ChevronUp, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/Form'

/** Every non-empty value becomes a query param; "" means not set. */
export type FilterValues = Record<string, string>

export type FilterField =
  | { key: string; type: 'text'; label: string; placeholder?: string }
  | { key: string; type: 'date'; label: string }
  | { key: string; type: 'number'; label: string; placeholder?: string }
  | { key: string; type: 'select'; label: string; options: { value: string; label: string }[] }

const inputCls =
  'h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-surface'

/**
 * One-row filter strip shared by every table page: search first (wider),
 * then compact labeled controls, and a Reset button whenever anything is set.
 */
export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
}: {
  filters: FilterField[]
  onChange: (key: string, value: string) => void
  values: FilterValues
  onReset: () => void
}) {
  const search = filters[0]?.type === 'text' ? filters[0] : undefined
  const rest = filters.filter((f) => f !== search)
  const dirty = filters.some((f) => (values[f.key] ?? '') !== '')

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-4 border-b border-line p-4">
      {search && (
        <label className="block min-w-52 flex-[2] max-w-sm">
          <span className="mb-1 block text-[11px] font-semibold text-muted">Search</span>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            {/* pl-9 pushes the placeholder past the absolutely-positioned icon
                (px-3 alone puts text under it on every width). */}
            <input
              value={values[search.key] ?? ''}
              onChange={(e) => onChange(search.key, e.target.value)}
              placeholder={search.placeholder ?? `Search ${search.label.toLowerCase()}`}
              className={`${inputCls} pl-9`}
            />
          </div>
        </label>
      )}

      {rest.map((field) => (
        <label key={field.key} className="block min-w-36">
          <span className="mb-1 block text-[11px] font-semibold text-muted">{field.label}</span>
          {field.type === 'select' ? (
            <select
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={inputCls}
            >
              <option value="">All</option>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              // Only text/number variants define a placeholder.
              placeholder={field.type !== 'date' ? field.placeholder : undefined}
              className={inputCls}
            />
          )}
        </label>
      ))}

      {dirty && (
        <Button variant="ghost" className="px-3!" onClick={onReset} title="Clear filters">
          <RotateCcw size={14} /> Reset
        </Button>
      )}
    </div>
  )
}

/**
 * Sortable table header cell. Clicking cycles: asc → desc → back to the
 * server default. Arrow shows the active direction.
 */
export function SortTh({
  label,
  field,
  activeField,
  activeDir,
  onSort,
  align = 'left',
}: {
  label: string
  field: string
  activeField: string
  activeDir: 'asc' | 'desc'
  onSort: (field: string, dir: 'asc' | 'desc') => void
  align?: 'left' | 'right'
}) {
  const active = activeField === field
  const Icon = active ? (activeDir === 'asc' ? ChevronUp : ChevronDown) : null
  const next: 'asc' | 'desc' = active && activeDir === 'asc' ? 'desc' : 'asc'
  return (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => onSort(field, next)}
        className={`inline-flex items-center gap-1 font-semibold transition-colors hover:text-ink ${
          active ? 'text-primary' : 'text-muted'
        }`}
      >
        {label}
        {Icon && <Icon size={13} />}
      </button>
    </th>
  )
}
