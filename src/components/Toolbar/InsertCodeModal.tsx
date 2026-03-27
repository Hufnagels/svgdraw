import { useState, useEffect, useRef } from 'react'
import type { BarcodeSymbology } from '../../types/elements'
import { renderBarcode } from '../../utils/barcodeRenderer'
import { X } from 'lucide-react'

type CodeMode = 'barcode' | 'qr' | 'datamatrix'

const BARCODE_TYPES: Array<{ value: BarcodeSymbology; label: string; modes: CodeMode[] }> = [
  { value: 'code128',    label: 'Code 128',     modes: ['barcode'] },
  { value: 'code39',     label: 'Code 39',      modes: ['barcode'] },
  { value: 'ean13',      label: 'EAN-13',       modes: ['barcode'] },
  { value: 'ean8',       label: 'EAN-8',        modes: ['barcode'] },
  { value: 'upca',       label: 'UPC-A',        modes: ['barcode'] },
  { value: 'upce',       label: 'UPC-E',        modes: ['barcode'] },
  { value: 'pdf417',     label: 'PDF417',       modes: ['barcode'] },
  { value: 'qrcode',     label: 'QR Code',      modes: ['qr'] },
  { value: 'datamatrix', label: 'Data Matrix',  modes: ['datamatrix'] },
  { value: 'azteccode',  label: 'Aztec Code',   modes: ['datamatrix'] },
]

const MODE_DEFAULTS: Record<CodeMode, { symbology: BarcodeSymbology; data: string }> = {
  barcode:    { symbology: 'code128',    data: '1234567890' },
  qr:         { symbology: 'qrcode',     data: 'https://example.com' },
  datamatrix: { symbology: 'datamatrix', data: 'Hello World' },
}

interface Props {
  mode: CodeMode
  onInsert: (symbology: BarcodeSymbology, data: string, svgResult: { svgString: string; rawWidth: number; rawHeight: number }) => void
  onClose: () => void
}

export function InsertCodeModal({ mode, onInsert, onClose }: Props) {
  const defaults = MODE_DEFAULTS[mode]
  const [symbology, setSymbology] = useState<BarcodeSymbology>(defaults.symbology)
  const [data, setData] = useState(defaults.data)
  const [includeText, setIncludeText] = useState(true)
  const [previewSvg, setPreviewSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const dataInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const availableTypes = BARCODE_TYPES.filter((t) => t.modes.includes(mode))

  // Generate preview whenever data or symbology changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!data.trim()) { setPreviewSvg(''); return }
      setLoading(true)
      setError('')
      try {
        const result = await renderBarcode(symbology, data, { includeText: mode === 'barcode' ? includeText : false })
        setPreviewSvg(result.svgString)
      } catch (e) {
        setError(String(e))
        setPreviewSvg('')
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [symbology, data, includeText, mode])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => dataInputRef.current?.focus(), 50)
  }, [])

  async function handleInsert() {
    if (!data.trim()) return
    setLoading(true)
    try {
      const result = await renderBarcode(symbology, data, { includeText: mode === 'barcode' ? includeText : false })
      onInsert(symbology, data, result)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInsert() }
    if (e.key === 'Escape') onClose()
  }

  const title = mode === 'barcode' ? 'Insert Barcode' : mode === 'qr' ? 'Insert QR Code' : 'Insert Data Matrix / Aztec'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          width: 440,
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Symbology selector (only show if multiple options in this mode) */}
        {availableTypes.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Type
            </label>
            <select
              value={symbology}
              onChange={(e) => setSymbology(e.target.value as BarcodeSymbology)}
              style={{ ...inputStyle, fontFamily: 'inherit' }}
            >
              {availableTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Data input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {mode === 'qr' ? 'URL / Text' : 'Data'}
          </label>
          {mode === 'qr' ? (
            <textarea
              ref={dataInputRef as React.RefObject<HTMLTextAreaElement>}
              value={data}
              onChange={(e) => setData(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          ) : (
            <input
              ref={dataInputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={data}
              onChange={(e) => setData(e.target.value)}
              style={inputStyle}
            />
          )}
        </div>

        {/* Include text option (barcode only) */}
        {mode === 'barcode' && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="include-text"
              checked={includeText}
              onChange={(e) => setIncludeText(e.target.checked)}
              style={{ cursor: 'pointer', width: 16, height: 16 }}
            />
            <label htmlFor="include-text" style={{ color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Show text below barcode
            </label>
          </div>
        )}

        {/* Preview */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
          }}
        >
          {loading ? (
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Generating preview…</div>
          ) : error ? (
            <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>{error}</div>
          ) : previewSvg ? (
            <div
              dangerouslySetInnerHTML={{ __html: previewSvg }}
              style={{ maxWidth: '100%', maxHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Enter data to preview</div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '9px', background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={loading || !data.trim() || !!error}
            style={{
              flex: 2, padding: '9px', background: loading || !data.trim() || !!error ? '#1e3a5f' : '#2563eb',
              border: 'none', borderRadius: 8, color: loading || !data.trim() || !!error ? 'var(--text-muted)' : 'white',
              fontSize: 13, fontWeight: 600, cursor: loading || !data.trim() || !!error ? 'not-allowed' : 'pointer',
            }}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
