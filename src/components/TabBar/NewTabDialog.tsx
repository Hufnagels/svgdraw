import { useState } from 'react'
import { useTabsStore, DEFAULT_CANVAS_SETTINGS } from '../../store/useTabsStore'
import { mmToPx, DPI_OPTIONS, type DPI } from '../../utils/units'

interface Preset { label: string; wMm: number; hMm: number }

const PRESETS: Preset[] = [
  { label: 'A4',            wMm: 210, hMm: 297 },
  { label: '50 × 25 mm',    wMm: 50,  hMm: 25  },
  { label: 'Business Card', wMm: 85,  hMm: 54  },
  { label: '100 × 100 mm',  wMm: 100, hMm: 100 },
  { label: 'Custom',        wMm: 0,   hMm: 0   },
]

interface Props { onClose: () => void }

export function NewTabDialog({ onClose }: Props) {
  const newTab = useTabsStore((s) => s.newTab)

  const [name,    setName]    = useState('Untitled')
  const [widthMm, setWidthMm] = useState(100)
  const [heightMm,setHeightMm]= useState(50)
  const [dpi,     setDpi]     = useState<DPI>(203)
  const [radiusMm,setRadiusMm]= useState(0)
  const [preset,  setPreset]  = useState('100 × 100 mm')

  function applyPreset(p: Preset) {
    setPreset(p.label)
    if (p.label !== 'Custom') { setWidthMm(p.wMm); setHeightMm(p.hMm) }
  }

  const pxW = mmToPx(widthMm, dpi)
  const pxH = mmToPx(heightMm, dpi)

  function handleCreate() {
    const borderRadius = mmToPx(radiusMm, dpi)
    newTab(name.trim() || 'Untitled', {
      elements: {},
      zOrder: [],
      canvas: {
        ...DEFAULT_CANVAS_SETTINGS,
        widthMm, heightMm, dpi,
        width: pxW, height: pxH,
        borderRadius,
      },
    })
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 1001,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, width: 360,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>New Label</div>

        {/* Name */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={lbl}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)}
            style={inp} autoFocus onFocus={(e) => e.target.select()} />
        </label>

        {/* DPI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>Resolution (DPI)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {DPI_OPTIONS.map((v) => (
              <button key={v} onClick={() => setDpi(v)} style={{
                flex: 1, padding: '4px 0', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: dpi === v ? '#2563eb' : 'var(--bg-input)',
                color: dpi === v ? '#fff' : 'var(--text-secondary)',
              }}>{v} dpi</button>
            ))}
          </div>
        </div>

        {/* Size presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>Size</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)} style={{
                padding: '3px 10px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: preset === p.label ? '#2563eb' : 'var(--bg-input)',
                color: preset === p.label ? '#fff' : 'var(--text-secondary)',
              }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min={1} max={2000} value={widthMm}
              onChange={(e) => { setWidthMm(parseFloat(e.target.value) || 1); setPreset('Custom') }}
              style={{ ...inp, width: 70, textAlign: 'center' }} />
            <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>×</span>
            <input type="number" min={1} max={2000} value={heightMm}
              onChange={(e) => { setHeightMm(parseFloat(e.target.value) || 1); setPreset('Custom') }}
              style={{ ...inp, width: 70, textAlign: 'center' }} />
            <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>mm</span>
            <span style={{ color: 'var(--text-disabled)', fontSize: 10, marginLeft: 4 }}>
              = {pxW}×{pxH} px
            </span>
          </div>
        </div>

        {/* Corners */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>Corners</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <CornerBtn label="Square"  active={radiusMm === 0} onClick={() => setRadiusMm(0)} rounded={false} />
            <CornerBtn label="Rounded" active={radiusMm > 0}   onClick={() => { if (radiusMm === 0) setRadiusMm(2) }} rounded />
          </div>
          {radiusMm > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min={0.5} max={20} step={0.5} value={radiusMm}
                onChange={(e) => setRadiusMm(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#2563eb' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 48, textAlign: 'right' }}>
                {radiusMm} mm
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={{ ...btn, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleCreate} style={{ ...btn, background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8' }}>Create</button>
        </div>
      </div>
    </>
  )
}

function CornerBtn({ label, active, onClick, rounded }: { label: string; active: boolean; onClick: () => void; rounded: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      padding: '8px 4px', cursor: 'pointer', borderRadius: 6,
      border: active ? '2px solid #2563eb' : '1px solid var(--border)',
      background: active ? 'rgba(37,99,235,0.08)' : 'var(--bg-input)',
      color: 'var(--text-secondary)',
    }}>
      <svg width={28} height={20} viewBox="0 0 28 20">
        <rect x={2} y={2} width={24} height={16} rx={rounded ? 5 : 0} fill="none" stroke="currentColor" strokeWidth={1.5} />
      </svg>
      <span style={{ fontSize: 11 }}>{label}</span>
    </button>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }
const inp: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text-primary)', padding: '5px 8px', fontSize: 12, outline: 'none', width: '100%',
}
const btn: React.CSSProperties = {
  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)',
  fontSize: 12, cursor: 'pointer', fontWeight: 500,
}
