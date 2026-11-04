import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base =
  'w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-surface'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} min-h-24 ${props.className ?? ''}`} />
}

const variants = {
  primary: 'bg-primary text-white hover:bg-indigo-500',
  ghost: 'text-muted hover:bg-canvas hover:text-ink',
  danger: 'text-danger hover:bg-danger-bg',
} as const

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      {...props}
      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  )
}

/** Status pill for tables, using the brand status colors. */
export function StatusPill({ tone, label }: { tone: 'success' | 'warning' | 'error' | 'primary'; label: string }) {
  const tones = {
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    error: 'bg-danger-bg text-danger',
    primary: 'bg-primary-light text-primary',
  } as const
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{label}</span>
  )
}
