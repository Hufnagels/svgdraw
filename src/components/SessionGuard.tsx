/*
 * components/SessionGuard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * After IDLE_MS of user inactivity, shows a dialog:
 *   "Stay logged in" → renewToken() → timer reset
 *   "Exit"           → signOut()    → navigate /signin
 * Triggers: mousemove, click, keydown, scroll, touchstart
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuthStore } from '../store/useAuthStore'

const IDLE_MS = 15 * 60 * 1000 // 15 min

export function SessionGuard() {
  const token     = useAuthStore((s) => s.token)
  const renewToken = useAuthStore((s) => s.renewToken)
  const signOut   = useAuthStore((s) => s.signOut)
  const navigate  = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!token) return

    let timer: ReturnType<typeof setTimeout>

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setShow(true), IDLE_MS)
    }

    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [token])

  async function handleStay() {
    setShow(false)
    await renewToken()
  }

  function handleExit() {
    setShow(false)
    signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <Dialog.Root open={show}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.5)',
        }} />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10001,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '24px 28px',
            width: 360,
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          }}
        >
          <Dialog.Title style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Session Expiring
          </Dialog.Title>
          <Dialog.Description style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Your session is about to expire due to inactivity. Do you want to stay logged in?
          </Dialog.Description>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button
              onClick={handleExit}
              style={{
                padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'none', color: '#f87171', fontSize: 13, cursor: 'pointer',
              }}
            >
              Sign out
            </button>
            <button
              onClick={handleStay}
              autoFocus
              style={{
                padding: '7px 16px', borderRadius: 6, border: 'none',
                background: 'var(--text-primary)', color: 'var(--bg-app)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Stay logged in
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
