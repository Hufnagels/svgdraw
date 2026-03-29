

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { VITE_APP_NAME, VITE_APP_SUBTILE } from '../features/config'

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn, fetchCurrentUser, loading } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    try {
      await signIn(username, password)
      await fetchCurrentUser()
      navigate('/')
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail
      setErrorMsg(detail ?? 'Sign in failed')
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* Left panel — fills all space left of the 420px right panel */}
      <div style={{
        width: 'calc(100vw - 420px)',
        flexShrink: 0,
        display: 'flex',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background pattern */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--text-primary)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#grid)" />
        </svg>

        {/* Demo label SVG */}
        <div style={{ position: 'relative', zIndex: 1, padding: 40, textAlign: 'center' }}>
          <svg width="280" height="180" viewBox="0 0 280 180" style={{ borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <rect width="280" height="180" fill="white" rx="8" />
            <rect x="16" y="16" width="248" height="2" fill="#000" />
            <rect x="16" y="20" width="248" height="90" fill="white" />
            {/* Barcode bars */}
            {[0,3,5,8,10,14,16,19,21,23,26,28,31,33,36,38,41,43,46,48,51,53,56,58].map((x) => (
              <rect key={x} x={16 + x * 3.5} y="24" width="2" height="70" fill="#000" />
            ))}
            <text x="140" y="108" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#000">12345678</text>
            <text x="16" y="135" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#000">Product Label</text>
            <text x="16" y="152" fontFamily="sans-serif" fontSize="9" fill="#555">SKU: ABC-001 · Lot: 2024-03</text>
            <rect x="16" y="160" width="248" height="2" fill="#000" />
          </svg>
        </div>

        {/* Bottom text */}
        <div style={{ position: 'absolute', bottom: 48, left: 48, right: 48 }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            {VITE_APP_NAME}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {VITE_APP_SUBTILE}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: 420,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        background: 'var(--bg-app)',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>

          {/* App icon / logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="4" y="4" width="28" height="28" rx="4" stroke="var(--text-primary)" strokeWidth="2" fill="none" />
                <rect x="9" y="14" width="2" height="14" fill="var(--text-primary)" />
                <rect x="13" y="10" width="2" height="18" fill="var(--text-primary)" />
                <rect x="17" y="14" width="2" height="14" fill="var(--text-primary)" />
                <rect x="21" y="11" width="2" height="17" fill="var(--text-primary)" />
                <rect x="25" y="14" width="2" height="14" fill="var(--text-primary)" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Welcome back
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Sign in to your account to continue.
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="username" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontSize: 14,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="password" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    padding: '8px 40px 8px 12px',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-disabled)', padding: 0, display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{ fontSize: 12, color: '#f87171', padding: '6px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: 5 }}>
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                background: loading ? 'var(--bg-input)' : 'var(--text-primary)',
                color: loading ? 'var(--text-disabled)' : 'var(--bg-app)',
                border: 'none',
                borderRadius: 6,
                padding: '10px 0',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
              }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                : 'Sign In'
              }
            </button>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {'admin / admin123'}
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
