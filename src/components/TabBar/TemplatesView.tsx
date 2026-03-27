import { useTabsStore, DEFAULT_CANVAS_SETTINGS } from '../../store/useTabsStore'
import { mmToPx, DPI_OPTIONS, type DPI } from '../../utils/units'
import { useState } from 'react'

interface Template { id: string; name: string; widthMm: number; heightMm: number }

const TEMPLATES: Template[] = [
  { id: 'blank-a4',       name: 'A4',                widthMm: 210,  heightMm: 297 },
  { id: 'label-145x105',  name: '145 × 105 mm',      widthMm: 145,  heightMm: 105 },
  { id: 'label-105x80',   name: '105 × 80 mm',       widthMm: 105,  heightMm: 80  },
  { id: 'bizcard-85x54',  name: 'Business Card',      widthMm: 85,   heightMm: 54  },
  { id: 'square-100',     name: '100 × 100 mm',       widthMm: 100,  heightMm: 100 },
  { id: 'label-70x50',    name: '70 × 50 mm',         widthMm: 70,   heightMm: 50  },
  { id: 'label-50x25',    name: '50 × 25 mm',          widthMm: 50,   heightMm: 25  },
]

export function TemplatesView() {
  const newTab = useTabsStore((s) => s.newTab)
  const [dpi, setDpi] = useState<DPI>(203)

  function openTemplate(t: Template) {
    newTab(t.name, {
      elements: {},
      zOrder: [],
      canvas: {
        ...DEFAULT_CANVAS_SETTINGS,
        widthMm: t.widthMm, heightMm: t.heightMm, dpi,
        width: mmToPx(t.widthMm, dpi), height: mmToPx(t.heightMm, dpi),
      },
    })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32, background: 'var(--bg-app)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Templates</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DPI</span>
          {DPI_OPTIONS.map((v) => (
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} dpi={dpi} onOpen={() => openTemplate(t)} />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({ template, dpi, onOpen }: { template: Template; dpi: DPI; onOpen: () => void }) {
  const maxPreviewW = 120
  const maxPreviewH = 100
  const scale = Math.min(maxPreviewW / template.widthMm, maxPreviewH / template.heightMm)
  const pw = Math.round(template.widthMm * scale)
  const ph = Math.round(template.heightMm * scale)
  const pxW = mmToPx(template.widthMm, dpi)
  const pxH = mmToPx(template.heightMm, dpi)

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: 16, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}
    >
      <div style={{
        width: pw, height: ph,
        background: '#ffffff', border: '1px solid var(--border)', borderRadius: 2, flexShrink: 0,
      }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
          {template.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {template.widthMm} × {template.heightMm} mm
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 1 }}>
          {pxW} × {pxH} px @ {dpi} dpi
        </div>
      </div>
    </div>
  )
}
