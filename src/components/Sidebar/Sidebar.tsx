import { useDrawingStore } from '../../store/useDrawingStore'
import {
  MousePointer2, Circle, Square, Minus, Type, Image as ImageIcon,
  Barcode, Pencil, Group, QrCode, Eye, EyeOff, Lock, Unlock,
} from 'lucide-react'
import type { DrawingElement } from '../../types/elements'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  select:    <MousePointer2 size={13} />,
  circle:    <Circle size={13} />,
  rect:      <Square size={13} />,
  line:      <Minus size={13} />,
  text:      <Type size={13} />,
  image:     <ImageIcon size={13} />,
  barcode:   <Barcode size={13} />,
  qr:        <QrCode size={13} />,
  freehand:  <Pencil size={13} />,
  group:     <Group size={13} />,
}

function elementLabel(el: DrawingElement): string {
  if (el.type === 'text') return `"${'content' in el ? String((el as { content: string }).content).slice(0, 18) : 'Text'}"`
  if (el.type === 'barcode') return `${'symbology' in el ? (el as { symbology: string }).symbology : 'Barcode'}`
  if (el.type === 'qr') return 'QR Code'
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}

export function Sidebar() {
  const elements    = useDrawingStore((s) => s.elements)
  const zOrder      = useDrawingStore((s) => s.zOrder)
  const selectedIds = useDrawingStore((s) => s.selectedIds)
  const setSelectedIds = useDrawingStore((s) => s.setSelectedIds)
  const updateElement  = useDrawingStore((s) => s.updateElement)

  // Root-level elements only, top-most first
  const rootIds = [...zOrder].reverse().filter((id) => elements[id] && !elements[id].parentId)

  return (
    <div style={{
      width: 180,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        Layers
      </div>

      {/* Layer list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rootIds.length === 0 && (
          <div style={{ padding: '20px 12px', fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center' }}>
            No layers yet
          </div>
        )}
        {rootIds.map((id) => {
          const el = elements[id]
          if (!el) return null
          const isSelected = selectedIds.includes(id)

          return (
            <div
              key={id}
              onClick={() => setSelectedIds([id])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(37,99,235,0.15)' : 'transparent',
                borderLeft: isSelected ? '2px solid #2563eb' : '2px solid transparent',
                userSelect: 'none',
              }}
            >
              {/* Type icon */}
              <span style={{ color: isSelected ? '#2563eb' : 'var(--text-muted)', flexShrink: 0 }}>
                {TYPE_ICONS[el.type] ?? <Square size={13} />}
              </span>

              {/* Label */}
              <span style={{
                flex: 1,
                fontSize: 12,
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {elementLabel(el)}
              </span>

              {/* Visibility toggle */}
              <button
                title={el.visible ? 'Hide' : 'Show'}
                onClick={(e) => { e.stopPropagation(); updateElement(id, { visible: !el.visible }) }}
                style={{
                  background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                  color: el.visible ? 'var(--text-secondary)' : 'var(--text-disabled)',
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                }}
              >
                {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>

              {/* Lock toggle */}
              <button
                title={el.locked ? 'Unlock' : 'Lock'}
                onClick={(e) => { e.stopPropagation(); updateElement(id, { locked: !el.locked }) }}
                style={{
                  background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                  color: el.locked ? '#f59e0b' : 'var(--text-disabled)',
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                }}
              >
                {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
