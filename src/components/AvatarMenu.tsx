import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Monitor, LogOut } from 'lucide-react'
import { useTheme, setTheme, type Theme } from '../hooks/useTheme'
import { useAuthStore } from '../store/useAuthStore'

const THEMES: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: 'light',  icon: <Sun size={14} />,     label: 'Light'  },
  { value: 'dark',   icon: <Moon size={14} />,    label: 'Dark'   },
  { value: 'system', icon: <Monitor size={14} />, label: 'System' },
]

function initials(user: { name?: string; username?: string } | null): string {
  const name = user?.name || user?.username || '?'
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export function AvatarMenu() {
  const { theme } = useTheme()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (dropRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function toggle() {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen((s) => !s)
  }

  function handleSignOut() {
    setOpen(false)
    signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <>
      {/* Avatar button */}
      <button
        ref={btnRef}
        onClick={toggle}
        title={user?.name ?? user?.username ?? 'Account'}
        style={{
          width: 30, height: 30,
          borderRadius: '50%',
          background: open ? 'var(--accent, #3b82f6)' : 'var(--bg-input)',
          border: '1px solid var(--border)',
          color: open ? '#fff' : 'var(--text-secondary)',
          fontSize: 11, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {initials(user)}
      </button>

      {/* Dropdown portal */}
      {open && rect && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
            zIndex: 9999,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            minWidth: 200,
            overflow: 'hidden',
          }}
        >
          {/* User info */}
          <div style={{
            padding: '10px 14px 8px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name || user?.username || 'Admin'}
            </div>
            {user?.email && (
              <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 1 }}>
                {user.email}
              </div>
            )}
          </div>

          {/* Theme section */}
          <div style={{ padding: '8px 8px 4px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-disabled)', padding: '0 6px 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Theme
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  title={t.label}
                  style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '6px 4px',
                    borderRadius: 6,
                    border: theme === t.value ? '1px solid var(--accent, #3b82f6)' : '1px solid var(--border)',
                    background: theme === t.value ? 'rgba(59,130,246,0.12)' : 'var(--bg-input)',
                    color: theme === t.value ? 'var(--accent, #3b82f6)' : 'var(--text-secondary)',
                    fontSize: 10, cursor: 'pointer',
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div style={{ padding: '4px 8px 8px' }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 8px',
                borderRadius: 6,
                border: 'none',
                background: 'none',
                color: '#f87171',
                fontSize: 13, cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
