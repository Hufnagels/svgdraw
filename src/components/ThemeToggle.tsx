import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, cycleTheme } from '../hooks/useTheme'

const ICONS = { dark: <Moon size={14} />, light: <Sun size={14} />, system: <Monitor size={14} /> }

export function ThemeToggle() {
  const { theme } = useTheme()

  return (
    <button
      title={`Theme: ${theme} — click to cycle`}
      onClick={cycleTheme}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 8px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--text-secondary)',
        fontSize: 12,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {ICONS[theme]}
    </button>
  )
}
