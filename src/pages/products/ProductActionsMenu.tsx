import { Pencil, Trash2 } from 'lucide-react'

export function ProductActionsMenu({
  onEdit,
  onDelete,
  onClose,
}: {
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      onBlur={onClose}
      tabIndex={-1}
      className="absolute right-3 top-[calc(100%-14px)] z-10 w-40 rounded-card border border-line bg-surface p-1.5 shadow-card"
    >
      <button
        onClick={onEdit}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas"
      >
        <Pencil size={15} className="text-muted" /> Edit
      </button>
      <button
        onClick={onDelete}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-bg"
      >
        <Trash2 size={15} /> Delete
      </button>
    </div>
  )
}
