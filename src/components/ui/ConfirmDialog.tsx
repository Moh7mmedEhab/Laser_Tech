import { Button } from './Form'
import { Modal } from './Modal'

/** Brand-styled delete confirmation dialog, reused by all CRUD pages. */
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" className="bg-danger hover:bg-red-600" onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
