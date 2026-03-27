import { useState } from 'react'
import { useDrawingStore } from '../../store/useDrawingStore'
import { downloadSVG } from './SVGExporter'
import { downloadJPG } from './JPGExporter'
import { downloadPDF } from './PDFExporter'
import { Download } from 'lucide-react'

interface Props {
  getSVGRef: () => SVGSVGElement | null
}

export function ExportDialog({ getSVGRef }: Props) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const canvas = useDrawingStore((s) => s.canvas)

  async function handleExport(format: 'svg' | 'jpg' | 'pdf') {
    const svgEl = getSVGRef()
    if (!svgEl) return
    setExporting(true)
    try {
      if (format === 'svg') downloadSVG(svgEl, canvas)
      if (format === 'jpg') await downloadJPG(svgEl, canvas)
      if (format === 'pdf') await downloadPDF(svgEl, canvas)
    } catch (err) {
      console.error('Export error', err)
      alert('Export failed: ' + String(err))
    } finally {
      setExporting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        title="Export"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: '#2563eb',
          border: 'none',
          borderRadius: 6,
          color: 'white',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        <Download size={16} />
        Export
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              minWidth: 280,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Export Drawing</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
              {canvas.width} × {canvas.height} px
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['svg', 'jpg', 'pdf'] as const).map((fmt) => (
                <button
                  key={fmt}
                  disabled={exporting}
                  onClick={() => handleExport(fmt)}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    fontWeight: 500,
                  }}
                >
                  {fmt.toUpperCase()}
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
                    {fmt === 'svg' ? 'Vector — best for editing' : fmt === 'jpg' ? 'Raster image' : 'Vector PDF'}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
