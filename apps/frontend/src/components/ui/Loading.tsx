/**
 * Brand-themed loading indicators (Laser Tech primary = the icon indigo).
 * Spinner for blocking loads; dots for inline "refreshing" hints.
 */

export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-block shrink-0 animate-spin rounded-full border-[2.5px] border-primary border-t-transparent"
    />
  )
}

export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-primary"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
        />
      ))}
    </span>
  )
}

/** Spinner + optional caption, sized for page/section-level placeholders. */
export function LoadingLabel({ label = 'Loading', caption }: { label?: string; caption?: string }) {
  return (
    <span className="inline-flex flex-col items-center gap-3">
      <Spinner />
      <span className="text-sm text-muted">
        {label}
        {caption && <span className="ml-1 text-xs">{caption}</span>}
      </span>
    </span>
  )
}
