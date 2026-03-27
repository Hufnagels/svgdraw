import { useDrawingStore } from '../../store/useDrawingStore'
import type {
  DrawingElement, CircleElement, RectElement, LineElement,
  TextElement, BarcodeElement, QRElement, BarcodeSymbology
} from '../../types/elements'
import { renderBarcode } from '../../utils/barcodeRenderer'
import { ColorPicker } from '../Toolbar/ColorPicker'
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react'

type UpdateFn = (id: string, patch: Partial<DrawingElement>) => void

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  padding: '4px 6px',
  fontSize: 12,
}

function NumberInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={Math.round(value * 100) / 100}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={inputStyle}
    />
  )
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  )
}

export function PropertiesPanel() {
  const selectedIds = useDrawingStore((s) => s.selectedIds)
  const elements = useDrawingStore((s) => s.elements)
  const updateElement = useDrawingStore((s) => s.updateElement)

  if (selectedIds.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-disabled)', fontSize: 12, textAlign: 'center' }}>
        <div style={{ marginTop: 24 }}>No element selected</div>
      </div>
    )
  }

  if (selectedIds.length > 1) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>{selectedIds.length} elements selected</div>
        <StyleSection ids={selectedIds} elements={elements} updateElement={updateElement} />
      </div>
    )
  }

  const el = elements[selectedIds[0]]
  if (!el) return null

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {el.type}
      </div>

      <Field label="X">
        <NumberInput value={el.transform.x} onChange={(v) => updateElement(el.id, { transform: { ...el.transform, x: v } })} step={0.5} />
      </Field>
      <Field label="Y">
        <NumberInput value={el.transform.y} onChange={(v) => updateElement(el.id, { transform: { ...el.transform, y: v } })} step={0.5} />
      </Field>
      <Field label="Rotation">
        <NumberInput value={el.transform.rotation} onChange={(v) => updateElement(el.id, { transform: { ...el.transform, rotation: v } })} min={0} max={360} />
      </Field>

      <TypeSpecificFields el={el} updateElement={updateElement} />
      <StyleSection ids={[el.id]} elements={elements} updateElement={updateElement} />
    </div>
  )
}

function TypeSpecificFields({ el, updateElement }: { el: DrawingElement; updateElement: UpdateFn }) {
  switch (el.type) {
    case 'circle':
      return (
        <>
          <Field label="Rx (width/2)">
            <NumberInput value={(el as CircleElement).rx} min={1} onChange={(v) => updateElement(el.id, { rx: v } as Partial<CircleElement>)} />
          </Field>
          <Field label="Ry (height/2)">
            <NumberInput value={(el as CircleElement).ry} min={1} onChange={(v) => updateElement(el.id, { ry: v } as Partial<CircleElement>)} />
          </Field>
        </>
      )
    case 'rect':
      return (
        <>
          <Field label="Width">
            <NumberInput value={(el as RectElement).width} min={1} onChange={(v) => updateElement(el.id, { width: v } as Partial<RectElement>)} />
          </Field>
          <Field label="Height">
            <NumberInput value={(el as RectElement).height} min={1} onChange={(v) => updateElement(el.id, { height: v } as Partial<RectElement>)} />
          </Field>
          <Field label="Corner Radius">
            <NumberInput value={(el as RectElement).rx} min={0} onChange={(v) => updateElement(el.id, { rx: v, ry: v } as Partial<RectElement>)} />
          </Field>
        </>
      )
    case 'line':
      return (
        <>
          <Field label="X1"><NumberInput value={(el as LineElement).x1} onChange={(v) => updateElement(el.id, { x1: v } as Partial<LineElement>)} /></Field>
          <Field label="Y1"><NumberInput value={(el as LineElement).y1} onChange={(v) => updateElement(el.id, { y1: v } as Partial<LineElement>)} /></Field>
          <Field label="X2"><NumberInput value={(el as LineElement).x2} onChange={(v) => updateElement(el.id, { x2: v } as Partial<LineElement>)} /></Field>
          <Field label="Y2"><NumberInput value={(el as LineElement).y2} onChange={(v) => updateElement(el.id, { y2: v } as Partial<LineElement>)} /></Field>
        </>
      )
    case 'text': {
      const t = el as TextElement
      const toggleBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
        <button
          title={title}
          onClick={onClick}
          style={{
            flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
            background: active ? '#2563eb' : 'var(--bg-input)',
            color: active ? 'white' : 'var(--text-secondary)',
          }}
        >{icon}</button>
      )
      return (
        <>
          <Field label="Content">
            <textarea
              value={t.content}
              onChange={(e) => updateElement(el.id, { content: e.target.value } as Partial<TextElement>)}
              style={{ ...inputStyle, height: 60, resize: 'vertical' }}
            />
          </Field>
          <Field label="Font Size">
            <NumberInput value={t.fontSize} min={6} max={200} onChange={(v) => updateElement(el.id, { fontSize: v } as Partial<TextElement>)} />
          </Field>
          <Field label="Font Family">
            <select value={t.fontFamily} onChange={(e) => updateElement(el.id, { fontFamily: e.target.value } as Partial<TextElement>)} style={inputStyle}>
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
            </select>
          </Field>
          <Field label="Style">
            <div style={{ display: 'flex', gap: 4 }}>
              {toggleBtn(t.fontWeight === 'bold',   () => updateElement(el.id, { fontWeight: t.fontWeight === 'bold' ? 'normal' : 'bold' } as Partial<TextElement>),   <Bold size={13} />,   'Bold')}
              {toggleBtn(t.fontStyle === 'italic',  () => updateElement(el.id, { fontStyle: t.fontStyle === 'italic' ? 'normal' : 'italic' } as Partial<TextElement>), <Italic size={13} />, 'Italic')}
            </div>
          </Field>
          <Field label="Alignment">
            <div style={{ display: 'flex', gap: 4 }}>
              {toggleBtn(t.textAnchor === 'start',  () => updateElement(el.id, { textAnchor: 'start' }  as Partial<TextElement>), <AlignLeft size={13} />,   'Align Left')}
              {toggleBtn(t.textAnchor === 'middle', () => updateElement(el.id, { textAnchor: 'middle' } as Partial<TextElement>), <AlignCenter size={13} />, 'Align Center')}
              {toggleBtn(t.textAnchor === 'end',    () => updateElement(el.id, { textAnchor: 'end' }    as Partial<TextElement>), <AlignRight size={13} />,  'Align Right')}
            </div>
          </Field>
          <Field label="Width">
            <NumberInput value={t.width} min={10} onChange={(v) => updateElement(el.id, { width: v } as Partial<TextElement>)} />
          </Field>
        </>
      )
    }
    case 'barcode':
      return <BarcodeFields el={el as BarcodeElement} updateElement={updateElement} />
    case 'qr':
      return <QRFields el={el as QRElement} updateElement={updateElement} />
    case 'image':
    case 'freehand':
      return null
    case 'group':
      return <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8 }}>{(el as { childIds: string[] }).childIds.length} children</div>
    default:
      return null
  }
}

function BarcodeFields({ el, updateElement }: { el: BarcodeElement; updateElement: UpdateFn }) {
  async function handleChange(patch: Partial<BarcodeElement>) {
    const merged = { ...el, ...patch }
    try {
      const result = await renderBarcode(merged.symbology, merged.data, { includeText: merged.includeText })
      updateElement(el.id, {
        ...patch,
        cachedSvg: result.svgString,
        _rawWidth: result.rawWidth,
        _rawHeight: result.rawHeight,
      } as Partial<BarcodeElement>)
    } catch {
      updateElement(el.id, patch as Partial<BarcodeElement>)
    }
  }

  const symbologies: BarcodeSymbology[] = ['code128', 'code39', 'ean13', 'ean8', 'upca', 'upce', 'pdf417', 'datamatrix', 'azteccode', 'qrcode']

  return (
    <>
      <Field label="Symbology">
        <select value={el.symbology} onChange={(e) => handleChange({ symbology: e.target.value as BarcodeSymbology })} style={inputStyle}>
          {symbologies.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Data">
        <input type="text" value={el.data} onChange={(e) => handleChange({ data: e.target.value })} style={inputStyle} />
      </Field>
      <Field label="Width">
        <NumberInput value={el.width} min={20} onChange={(v) => updateElement(el.id, { width: v } as Partial<BarcodeElement>)} />
      </Field>
      <Field label="Height">
        <NumberInput value={el.height} min={20} onChange={(v) => updateElement(el.id, { height: v } as Partial<BarcodeElement>)} />
      </Field>
      <Field label="Include Text">
        <input type="checkbox" checked={el.includeText} onChange={(e) => handleChange({ includeText: e.target.checked })} style={{ cursor: 'pointer' }} />
      </Field>
    </>
  )
}

function QRFields({ el, updateElement }: { el: QRElement; updateElement: UpdateFn }) {
  async function handleChange(patch: Partial<QRElement>) {
    const merged = { ...el, ...patch }
    try {
      const result = await renderBarcode('qrcode', merged.data, { includeText: false })
      updateElement(el.id, { ...patch, cachedSvg: result.svgString } as Partial<QRElement>)
    } catch {
      updateElement(el.id, patch as Partial<QRElement>)
    }
  }

  return (
    <>
      <Field label="Data">
        <TextInput value={el.data} onChange={(v) => handleChange({ data: v })} />
      </Field>
      <Field label="Size">
        <NumberInput value={el.width} min={50} onChange={(v) => updateElement(el.id, { width: v, height: v } as Partial<QRElement>)} />
      </Field>
      <Field label="Error Correction">
        <select value={el.ecc} onChange={(e) => updateElement(el.id, { ecc: e.target.value as QRElement['ecc'] } as Partial<QRElement>)} style={inputStyle}>
          {(['L', 'M', 'Q', 'H'] as const).map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </Field>
    </>
  )
}

function StyleSection({ ids, elements, updateElement }: {
  ids: string[]
  elements: Record<string, DrawingElement>
  updateElement: UpdateFn
}) {
  const el = elements[ids[0]]
  if (!el) return null
  const { style } = el

  function updateStyle(patch: Partial<typeof style>) {
    ids.forEach((id) => {
      const existing = elements[id]
      if (existing) updateElement(id, { style: { ...existing.style, ...patch } })
    })
  }

  return (
    <div>
      <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '8px 0' }} />
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Style</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Fill</div>
          <ColorPicker color={style.fill} onChange={(c) => updateStyle({ fill: c })} label="" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Stroke</div>
          <ColorPicker color={style.stroke} onChange={(c) => updateStyle({ stroke: c })} label="" />
        </div>
      </div>
      <Field label="Stroke Width">
        <NumberInput value={style.strokeWidth} min={0} max={50} step={0.5} onChange={(v) => updateStyle({ strokeWidth: v })} />
      </Field>
      <Field label="Opacity">
        <input
          type="range"
          min={0} max={1} step={0.01}
          value={style.opacity}
          onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>{Math.round(style.opacity * 100)}%</div>
      </Field>
    </div>
  )
}
