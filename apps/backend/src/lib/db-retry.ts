/**
 * One-shot retry wrapper for single-statement (non-transactional) DB reads.
 *
 * Neon's pooler kills idle connections; the pg pool can hand back a socket
 * that just died between borrow and query (ETIMEDOUT/ECONNRESET). A single
 * immediate retry transparently re-establishes the connection — safe because
 * the wrapped calls execute exactly ONE statement.
 *
 * NEVER wrap a `$transaction` callback with this: retrying multi-statement
 * work on a fresh connection breaks atomicity.
 */
const TRANSIENT = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH'])

export async function withRetry<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query()
  } catch (first) {
    if (isTransient(first)) {
      return query()
    }
    throw first
  }
}

export function isTransient(err: unknown, depth = 0): boolean {
  if (depth > 3 || typeof err !== 'object' || err === null) return false
  const code = (err as { code?: unknown }).code
  if (typeof code === 'string' && TRANSIENT.has(code)) return true
  // Prisma wraps driver errors with a cause; check a few levels deep.
  return isTransient((err as { cause?: unknown }).cause, depth + 1)
}
