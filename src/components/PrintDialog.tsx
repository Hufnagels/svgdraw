import { useState, useEffect, useRef } from 'react'
import { Printer, X, Wifi } from 'lucide-react'
import axios from 'axios'
import { useDrawingStore } from '../store/useDrawingStore'
import { useTabsStore } from '../store/useTabsStore'
import { useAuthStore } from '../store/useAuthStore'
import { exportSVG } from './ExportDialog/SVGExporter'
import { convertToZPL } from '../utils/zplConverter'

interface Props { onClose: () => void }

export function PrintDialog({ onClose }: Props) {
  const canvas    = useDrawingStore((s) => s.canvas)
  const elements  = useDrawingStore((s) => s.elements)
  const zOrder    = useDrawingStore((s) => s.zOrder)
  const token     = useAuthStore((s) => s.token)
  const svgRef    = useRef<HTMLDivElement>(null)
  const [svgStr, setSvgStr]       = useState('')
  const [copies, setCopies]       = useState(1)
  const [apiStatus, setApiStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [apiMsg, setApiMsg]       = useState('')

  const labelName = useTabsStore.getState().getActiveCanvasTab()?.name ?? 'label'

  // Generate clean SVG once on open
  useEffect(() => {
    const svgEl = document.querySelector('svg[data-drawing-canvas]') as SVGSVGElement | null
    if (svgEl) setSvgStr(exportSVG(svgEl, canvas))
  }, [canvas])

  // Fit preview: scale SVG to fit inside the preview box
  const maxPreviewW = 560
  const maxPreviewH = 420
  const scale = Math.min(1, maxPreviewW / canvas.width, maxPreviewH / canvas.height)
  const previewW = Math.round(canvas.width  * scale)
  const previewH = Math.round(canvas.height * scale)

  async function handleApiPrint() {
    setApiStatus('sending')
    setApiMsg('')
    try {
      const zpl = convertToZPL(elements, zOrder, canvas, { dpi: canvas.dpi === 300 ? 300 : 203 })
      await axios.post('/labeling/print', { zpl }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setApiStatus('ok')
      setApiMsg('Sent to printer')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setApiStatus('error')
      setApiMsg(detail ?? 'Print failed')
    }
  }

  function handlePrint() {
    if (!svgStr) return

    const pageSize = `${canvas.widthMm}mm ${canvas.heightMm}mm`

    // Open each copy in a single print window
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) { alert('Allow pop-ups to print.'); return }

    // For multiple copies, repeat the SVG
    const body = Array.from({ length: copies }, () =>
      `<div style="page-break-after:always;width:${canvas.widthMm}mm;height:${canvas.heightMm}mm;">${svgStr.replace(/^<\?xml[^>]+\?>/, '').trim()}</div>`
    ).join('\n')

    const multiHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: ${pageSize}; margin: 0; }
  html, body { margin: 0; padding: 0; }
  div { width: ${canvas.widthMm}mm; height: ${canvas.heightMm}mm; overflow: hidden; }
  svg { display: block; width: ${canvas.widthMm}mm !important; height: ${canvas.heightMm}mm !important; }
</style>
</head>
<body>${body}</body>
</html>`

    win.document.open()
    win.document.write(multiHtml)
    win.document.close()
    win.focus()
    // Wait for images / fonts to load before printing
    win.onload = () => { win.print(); win.close() }
    // Fallback in case onload doesn't fire (already loaded)
    setTimeout(() => { if (!win.closed) { win.print(); win.close() } }, 800)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000 }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 1001,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        width: 640, maxWidth: '95vw',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 10 }}>
          <Printer size={15} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>Print — {labelName}</span>
          <button onClick={onClose} style={iconBtn}><X size={14} /></button>
        </div>

        {/* Preview */}
        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, gap: 12,
          background: 'var(--bg-app)',
        }}>
          {/* Checkerboard background to show transparency */}
          <div style={{
            width: previewW, height: previewH,
            boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}>
            {svgStr && (
              <div
                ref={svgRef}
                style={{ width: previewW, height: previewH, overflow: 'hidden' }}
                dangerouslySetInnerHTML={{
                  __html: svgStr
                    .replace(/^<\?xml[^>]+\?>/, '')
                    .replace(/<svg([^>]*)width="[^"]*"/, `<svg$1width="${previewW}"`)
                    .replace(/height="[^"]*"/, `height="${previewH}"`)
                    .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${canvas.width} ${canvas.height}"`)
                }}
              />
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {canvas.widthMm} × {canvas.heightMm} mm &nbsp;·&nbsp; {canvas.width} × {canvas.height} px &nbsp;·&nbsp; {canvas.dpi} dpi
          </div>
        </div>

        {/* Footer / options */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Copies</span>
          <input
            type="number" min={1} max={100} value={copies}
            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: 56, background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 5, color: 'var(--text-primary)', padding: '4px 8px',
              fontSize: 12, textAlign: 'center',
            }}
          />
          <div style={{ flex: 1 }} />

          {/* API status message */}
          {apiStatus !== 'idle' && (
            <span style={{ fontSize: 12, color: apiStatus === 'ok' ? '#4ade80' : apiStatus === 'error' ? '#f87171' : 'var(--text-secondary)' }}>
              {apiStatus === 'sending' ? 'Sending…' : apiMsg}
            </span>
          )}

          <button onClick={onClose} style={{ ...btnBase, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Cancel</button>

          {/* Send to printer via API — only when authenticated */}
          {token && (
            <button
              onClick={handleApiPrint}
              disabled={apiStatus === 'sending'}
              style={{ ...btnBase, background: 'var(--bg-input)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Wifi size={13} /> Send to Printer
            </button>
          )}

          <button onClick={handlePrint} style={{ ...btnBase, background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={13} /> Print
          </button>
        </div>
      </div>
    </>
  )
}

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, borderRadius: 5, cursor: 'pointer',
  background: 'transparent', border: 'none', color: 'var(--text-muted)',
}

const btnBase: React.CSSProperties = {
  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)',
  fontSize: 12, cursor: 'pointer', fontWeight: 500,
}
