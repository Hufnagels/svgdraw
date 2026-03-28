import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  color: string
  onChange: (color: string) => void
  label: string
}

export function ColorPicker({ color, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState(color)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef      = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync hex input when color prop changes externally
  useEffect(() => { setInputVal(color) }, [color])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !dropdownRef.current?.contains(t))
        setClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function setClose() { setOpen(false) }

  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
    setInputVal(e.target.value)
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputVal(e.target.value)
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value) || e.target.value === 'none') {
      onChange(e.target.value)
    }
  }

  function handleOpen() {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      // Flip left if dropdown would overflow viewport right edge
      const left = r.right - 160 < 0 ? r.left : Math.min(r.left, window.innerWidth - 168)
      setPos({ top: r.bottom + 4, left })
    }
    setOpen((o) => !o)
  }

  const isNone = color === 'none'

  return (
    <>
      <button
        ref={btnRef}
        title={label || undefined}
        onClick={handleOpen}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '6px 8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: 10,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            border: '2px solid var(--text-disabled)',
            background: isNone
              ? 'repeating-linear-gradient(45deg,#ef4444,#ef4444 3px,transparent 3px,transparent 8px)'
              : color,
          }}
        />
        {label && (
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            minWidth: 160,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {label && (
            <div style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }}>{label}</div>
          )}
          <input
            type="color"
            value={isNone ? '#ffffff' : color}
            onChange={handleColorChange}
            style={{ width: '100%', height: 36, border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 8 }}
          />
          <input
            type="text"
            value={inputVal}
            onChange={handleHexChange}
            placeholder="#000000 or none"
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              padding: '4px 8px',
              fontSize: 12,
              fontFamily: 'monospace',
              marginBottom: 8,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => { onChange('none'); setInputVal('none'); setClose() }}
            style={{
              width: '100%',
              padding: '4px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
              marginBottom: 6,
            }}
          >
            None (transparent)
          </button>
          <button
            onClick={setClose}
            style={{
              width: '100%',
              padding: '4px',
              background: '#2563eb',
              border: 'none',
              borderRadius: 4,
              color: 'white',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
