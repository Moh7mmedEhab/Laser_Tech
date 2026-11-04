import { useSyncExternalStore } from 'react'
import { api, setUnauthorizedHandler } from '@/api/client'
import { connectSocket, disconnectSocket } from '@/api/socket'
import { bindRealtimeInvalidations } from '@/api/data'
import type { ApiMe } from '@/data/types'

type AuthSnapshot = {
  user: ApiMe | null
  /** null = still checking, false = signed out (login screen time). */
  settled: boolean
}

type LoginInput = { identifier: string; password: string }

/**
 * Session auth as an external store: the express cookie carries an opaque
 * token, so `me` is the only bootstrap query any page needs.
 */
class AuthStore {
  private listeners = new Set<() => void>()
  private snapshot: AuthSnapshot = { user: null, settled: false }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  private patch(next: Partial<AuthSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next }
    for (const listener of this.listeners) listener()
  }

  init = async () => {
    try {
      const { user } = await api.get<{ user: ApiMe | undefined }>('/auth/me')
      if (user) {
        connectSocket()
        bindRealtimeInvalidations()
        this.patch({ user, settled: true })
      } else {
        this.patch({ user: null, settled: true })
      }
    } catch {
      this.patch({ user: null, settled: true })
    }
  }

  login = async (input: LoginInput) => {
    const { user } = await api.post<{ user: ApiMe }>('/auth/login', input)
    connectSocket()
    bindRealtimeInvalidations()
    this.patch({ user, settled: true })
    return user
  }

  logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      disconnectSocket()
      this.patch({ user: null, settled: true })
    }
  }

  /** Force signed-out state (wired to the client's 401 handler). */
  reset = () => {
    this.patch({ user: null, settled: true })
  }

  /** POST-login self profile edit (username/email/phone). */
  updateProfile = async (input: Partial<Pick<ApiMe, 'username' | 'email' | 'phone'>>) => {
    const { user } = await api.patch<{ user: ApiMe }>('/auth/me', input)
    this.patch({ user: { ...this.snapshot.user, ...user } })
    return user
  }

  /** Rotates the session token; backend revokes every other session. */
  changePassword = async (currentPassword: string, newPassword: string) => {
    await api.patch('/auth/password', { currentPassword, newPassword })
  }
}

export const authStore = new AuthStore()
setUnauthorizedHandler(() => {
  disconnectSocket()
  authStore.reset()
})

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot)
}
