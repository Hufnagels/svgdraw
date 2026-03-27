import { useState } from 'react'
import { useDrawingStore } from '../../store/useDrawingStore'
import { useTabsStore } from '../../store/useTabsStore'
import { mmToPx, pxToMm, DPI_OPTIONS, type DPI } from '../../utils/units'

interface Props { onClose: () => void }

export function LabelSettingsDialog({ onClose }: Props) {
  const canvas    = useDrawingStore((s) => s.canvas)
  const updateCanvas = useDrawingStore((s) => s.updateCanvas)
  const tabsStore = useTabsStore
  const activeTab = tabsStore.getState().getActiveCanvasTab()

  const [name,     setName]     = useState(activeTab?.name ?? '')
  const [widthMm,  setWidthMm]  = useState(canvas.widthMm)
  const [heightMm, setHeightMm] = useState(canvas.heightMm)
  const [dpi,      setDpi]      = useState<DPI>(canvas.dpi)
  const [radiusMm, setRadiusMm] = useState(pxToMm(canvas.borderRadius, canvas.dpi))

  function handleApply() {
    const borderRadius = radiusMm > 0 ? mmToPx(radiusMm, dpi) : 0
    updateCanvas({ widthMm, heightMm, dpi, borderRadius })
    if (name.trim() && activeTab) {
      tabsStore.getState().setTabName(activeTab.id, name.trim())
    }
    onClose()
  }

  const pxW = mmToPx(widthMm, dpi)
  const pxH = mmToPx(heightMm, dpi)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
      <div style={{
        position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1001,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: 20, width: 340,
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Label Settings</div>

        {/* Name */}
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)}
            style={inp} onFocus={(e) => e.target.select()} />
        </Field>

        {/* DPI */}
        <Field label="Resolution (DPI)">
          <div style={{ display: 'flex', gap: 6 }}>
            {DPI_OPTIONS.map((v) => (
              <button key={v} onClick={() => setDpi(v)} style={{
                flex: 1, padding: '4px 0', fontSize: 11, borderRadius: 5, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: dpi === v ? '#2563eb' : 'var(--bg-input)',
                color: dpi === v ? '#fff' : 'var(--text-secondary)',
              }}>{v}</button>
            ))}
          </div>
        </Field>

        {/* Size */}
        <Field label="Size (mm)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min={1} max={2000} step={0.5} value={widthMm}
              onChange={(e) => setWidthMm(parseFloat(e.target.value) || 1)}
              style={{ ...inp, width: 70, textAlign: 'center' }} />
            <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>×</span>
            <input type="number" min={1} max={2000} step={0.5} value={heightMm}
              onChange={(e) => setHeightMm(parseFloat(e.target.value) || 1)}
              style={{ ...inp, width: 70, textAlign: 'center' }} />
            <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
              = {pxW}×{pxH} px
            </span>
          </div>
        </Field>

        {/* Corner radius */}
        <Field label={`Corner radius${radiusMm > 0 ? ` — ${radiusMm} mm` : ' — square'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={20} step={0.5} value={radiusMm}
              onChange={(e) => setRadiusMm(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#2563eb' }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 44, textAlign: 'right' }}>
              {radiusMm > 0 ? `${radiusMm} mm` : 'square'}
            </span>
          </div>
        </Field>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button onClick={onClose} style={{ ...btnBase, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleApply} style={{ ...btnBase, background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8' }}>Apply</button>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text-primary)', padding: '5px 8px', fontSize: 12, outline: 'none', width: '100%',
}
const btnBase: React.CSSProperties = {
  padding: '5px 14px', borderRadius: 6, border: '1px solid var(--border)',
  fontSize: 12, cursor: 'pointer', fontWeight: 500,
}
