import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useTabsStore, DEFAULT_CANVAS_SETTINGS } from '../store/useTabsStore'
import { parseZPL, type ZPLParseResult } from '../utils/zplParser'
import { mmToPx, DPI_OPTIONS, type DPI } from '../utils/units'
import { renderBarcode } from '../utils/barcodeRenderer'
import type { BarcodeElement, QRElement } from '../types/elements'

interface Parsed { result: ZPLParseResult; filename: string }

export function ZPLImportDialog({ onClose }: { onClose: () => void }) {
  const canvasDpi = useDrawingStore((s) => s.canvas.dpi) as DPI
  const [dpi,     setDpi]     = useState<DPI>(canvasDpi)
  const [parsed,  setParsed]  = useState<Parsed | null>(null)
  const [widthMm, setWidthMm] = useState(0)
  const [heightMm,setHeightMm]= useState(0)
  const [error,   setError]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null); setParsed(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const result = parseZPL(text, dpi)
        if (Object.keys(result.elements).length === 0) {
          setError('No elements found in the ZPL file.')
          return
        }

        // Render barcode/QR SVGs so they display immediately on import
        await Promise.all(
          Object.values(result.elements).map(async (el) => {
            if (el.type === 'barcode') {
              const bc = el as BarcodeElement
              try {
                const r = await renderBarcode(bc.symbology, bc.data, { includeText: bc.includeText })
                bc.cachedSvg = r.svgString
                bc._rawWidth = r.rawWidth
                bc._rawHeight = r.rawHeight
              } catch { /* keep empty cachedSvg — shows placeholder */ }
            } else if (el.type === 'qr') {
              const qr = el as QRElement
              try {
                const r = await renderBarcode('qrcode', qr.data, { includeText: false })
                qr.cachedSvg = r.svgString
              } catch { /* keep empty cachedSvg */ }
            }
          })
        )

        const filename = file.name.replace(/\.[^.]+$/, '')
        setParsed({ result, filename })
        setWidthMm(result.widthMm)
        setHeightMm(result.heightMm)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse ZPL file.')
      }
    }
    reader.readAsText(file)
  }

  function handleImport() {
    if (!parsed) return
    const w = Math.max(1, widthMm)
    const h = Math.max(1, heightMm)
    useTabsStore.getState().newTab(parsed.filename, {
      elements: parsed.result.elements,
      zOrder:   parsed.result.zOrder,
      canvas: {
        ...DEFAULT_CANVAS_SETTINGS,
        dpi,
        widthMm:  w, heightMm: h,
        width:  mmToPx(w, dpi),
        height: mmToPx(h, dpi),
      },
    })
    onClose()
  }

  const pxW = mmToPx(Math.max(1, widthMm),  dpi)
  const pxH = mmToPx(Math.max(1, heightMm), dpi)
  const elemCount = parsed ? Object.keys(parsed.result.elements).length : 0

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
        width: 380, maxWidth: '95vw',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>Import ZPL</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DPI</span>
            {DPI_OPTIONS.map((v) => (
              <button key={v} onClick={() => setDpi(v)} style={{
                padding: '2px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: dpi === v ? '#2563eb' : 'var(--bg-input)',
                color: dpi === v ? '#fff' : 'var(--text-secondary)',
              }}>{v}</button>
            ))}
          </div>
          <button onClick={onClose} style={iconBtnStyle}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* File picker */}
          <input
            ref={fileRef} type="file" accept=".zpl,.txt" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              padding: '7px 16px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
              background: parsed ? 'var(--bg-input)' : '#2563eb',
              color: parsed ? 'var(--text-secondary)' : '#fff',
              border: '1px solid var(--border)', fontWeight: 500, alignSelf: 'flex-start',
            }}
          >
            {parsed ? `${parsed.filename}.zpl  ↺` : 'Choose .zpl file…'}
          </button>

          {/* Error */}
          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}

          {/* Parsed result */}
          {parsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Dimensions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={labelStyle}>Dimensions (mm)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={1} max={2000} step={0.5} value={widthMm}
                    onChange={(e) => setWidthMm(parseFloat(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    style={{ ...inp, width: 72, textAlign: 'center' }}
                  />
                  <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>×</span>
                  <input
                    type="number" min={1} max={2000} step={0.5} value={heightMm}
                    onChange={(e) => setHeightMm(parseFloat(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    style={{ ...inp, width: 72, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>= {pxW} × {pxH} px</span>
                </div>
              </div>

              {/* Element count */}
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {elemCount} element{elemCount !== 1 ? 's' : ''} found
              </div>

              {/* Import button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleImport} style={{
                  padding: '6px 18px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                  background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500,
                }}>
                  Import
                </button>
              </div>
            </div>
          )}

          {!parsed && !error && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Opens in a new tab. Match the DPI to the original export.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  padding: '4px 6px', borderRadius: 5, cursor: 'pointer',
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
}
const inp: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text-primary)', padding: '5px 8px', fontSize: 12, outline: 'none',
}
