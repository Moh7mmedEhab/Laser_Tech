/**
 * Minimal fetch wrapper for the Express API. Cookies carry session auth, so
 * every request includes credentials; in dev the Vite proxy keeps it
 * same-origin. Errors surface the backend's human message via ApiError.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Called by the auth store so any 401 forces the login screen. */
let onUnauthorized: (() => void) | undefined
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const isJson = res.headers.get('content-type')?.includes('json') ?? false
  const payload: unknown = res.status === 204 ? undefined : isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const shape = (payload as { error?: { code?: string; message?: string } } | undefined)?.error
    const err = new ApiError(
      res.status,
      shape?.code ?? 'HTTP_ERROR',
      shape?.message ?? `Request failed with status ${res.status}`,
    )
    if (res.status === 401 && path !== '/auth/login') {
      onUnauthorized?.()
    }
    throw err
  }
  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path) as Promise<T>,
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body) as Promise<T>,
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body) as Promise<T>,
  del: <T>(path: string) => request<T>('DELETE', path) as Promise<T>,
}
