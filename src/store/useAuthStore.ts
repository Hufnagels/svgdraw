/*
 * store/useAuthStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : Zustand store for authentication — JWT token lifecycle and
 *           current user data.
 *
 * Key exports
 *   User         – { id, username, name, email, role }
 *   useAuthStore – Zustand store with token, user, loading, signIn,
 *                  fetchCurrentUser, signOut actions
 */

import { create } from 'zustand'
import axios from 'axios'
import { VITE_APP_API_URL } from '../features/config'

export interface User {
  id: number
  username: string
  name: string
  email: string
  role: string
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null

  signIn: (username: string, password: string) => Promise<void>
  fetchCurrentUser: () => Promise<void>
  renewToken: () => Promise<void>
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  loading: false,
  error: null,

  signIn: async (username, password) => {
    set({ loading: true, error: null })

    // Static fallback credentials
    if (username === 'admin' && password === 'admin123') {
      const token = 'static-token-admin'
      localStorage.setItem('token', token)
      set({
        token, loading: false,
        user: { id: 0, username: 'admin', name: 'Admin', email: 'admin@local', role: 'admin' },
      })
      return
    }

    try {
      const res = await axios.post(`${VITE_APP_API_URL}/auth/login`, { username, password })
      const token: string = res.data.access_token
      localStorage.setItem('token', token)
      set({ token, loading: false })
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      set({ loading: false, error: detail ?? 'Login failed' })
      throw { detail: detail ?? 'Login failed' }
    }
  },

  fetchCurrentUser: async () => {
    const { token } = get()
    if (!token || token === 'static-token-admin') return
    try {
      const res = await axios.get(`${VITE_APP_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      set({ user: res.data })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        localStorage.removeItem('token')
        set({ token: null, user: null })
      }
    }
  },

  renewToken: async () => {
    const { token } = get()
    try {
      const res = await axios.post(`${VITE_APP_API_URL}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const newToken: string = res.data.access_token
      localStorage.setItem('token', newToken)
      set({ token: newToken })
    } catch {
      get().signOut()
    }
  },

  signOut: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },
}))

// Global 401 interceptor — sign out on any expired token response
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().signOut()
    }
    return Promise.reject(err)
  },
)
