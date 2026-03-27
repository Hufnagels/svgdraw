import { useState, useMemo } from 'react'
import { Copy, Download, X } from 'lucide-react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useTabsStore } from '../store/useTabsStore'
import { convertToZPL, downloadZPL, type ZplDPI } from '../utils/zplConverter'

export function ZPLDialog({ onClose }: { onClose: () => void }) {
  const elements = useDrawingStore((s) => s.elements)
  const zOrder   = useDrawingStore((s) => s.zOrder)
  const canvas   = useDrawingStore((s) => s.canvas)
  const [dpi, setDpi] = useState<ZplDPI>(canvas.dpi as ZplDPI)
  const [copied, setCopied] = useState(false)

  const zpl = useMemo(
    () => convertToZPL(elements, zOrder, canvas, { dpi }),
    [elements, zOrder, canvas, dpi],
  )

  function handleCopy() {
    navigator.clipboard.writeText(zpl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleDownload() {
    const name = useTabsStore.getState().getActiveCanvasTab()?.name ?? 'label'
    downloadZPL(name, zpl)
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
        borderRadius: 10,
        width: 620, maxWidth: '95vw',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>ZPL Preview</span>

          {/* DPI selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Printer DPI</span>
            {([203, 300] as ZplDPI[]).map((v) => (
              <button
                key={v}
                onClick={() => setDpi(v)}
                style={{
                  padding: '2px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: dpi === v ? '#2563eb' : 'var(--bg-input)',
                  color: dpi === v ? '#fff' : 'var(--text-secondary)',
                }}
              >{v}</button>
            ))}
          </div>

          <button onClick={handleCopy} title="Copy to clipboard" style={iconBtnStyle}>
            <Copy size={14} />
            <span style={{ fontSize: 12 }}>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button onClick={handleDownload} title="Download .zpl" style={iconBtnStyle}>
            <Download size={14} />
            <span style={{ fontSize: 12 }}>Download</span>
          </button>
          <button onClick={onClose} style={{ ...iconBtnStyle, color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Code */}
        <pre style={{
          flex: 1, overflowY: 'auto', margin: 0,
          padding: '14px 16px',
          fontFamily: 'monospace', fontSize: 12,
          color: 'var(--text-primary)',
          background: 'var(--bg-app)',
          whiteSpace: 'pre',
          userSelect: 'text',
        }}>
          {zpl}
        </pre>

        {/* Footer hint */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
          Preview at <a href="https://labelary.com/viewer.html" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>labelary.com/viewer.html</a>
        </div>
      </div>
    </>
  )
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 8px', borderRadius: 5, cursor: 'pointer',
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-secondary)', fontSize: 12,
}
