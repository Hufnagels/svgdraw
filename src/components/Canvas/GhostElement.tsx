import { useDrawingStore } from '../../store/useDrawingStore'
import type { DrawingElement, CircleElement, RectElement, LineElement, TextElement } from '../../types/elements'

export function GhostElement() {
  const ghost = useDrawingStore((s) => s.ghostElement)
  if (!ghost || !ghost.type) return null

  const el = ghost as Partial<DrawingElement>
  const style = {
    fill: el.style?.fill ?? '#94a3b8',
    stroke: el.style?.stroke ?? '#2563eb',
    strokeWidth: el.style?.strokeWidth ?? 1,
    opacity: 0.5,
    strokeDasharray: '4 2',
  }

  switch (el.type) {
    case 'circle': {
      const c = el as Partial<CircleElement>
      return (
        <ellipse
          cx={c.transform?.x} cy={c.transform?.y}
          rx={c.rx ?? 0} ry={c.ry ?? 0}
          fill={style.fill} stroke={style.stroke}
          strokeWidth={style.strokeWidth} opacity={style.opacity}
          strokeDasharray={style.strokeDasharray}
          pointerEvents="none"
          className="ghost-element"
        />
      )
    }
    case 'rect': {
      const r = el as Partial<RectElement>
      return (
        <rect
          x={r.transform?.x} y={r.transform?.y}
          width={r.width ?? 0} height={r.height ?? 0}
          fill={style.fill} stroke={style.stroke}
          strokeWidth={style.strokeWidth} opacity={style.opacity}
          strokeDasharray={style.strokeDasharray}
          pointerEvents="none"
          className="ghost-element"
        />
      )
    }
    case 'line': {
      const l = el as Partial<LineElement>
      return (
        <line
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth} opacity={style.opacity}
          strokeDasharray={style.strokeDasharray}
          pointerEvents="none"
          className="ghost-element"
        />
      )
    }
    case 'text': {
      const t = el as Partial<TextElement>
      return (
        <rect
          x={t.transform?.x} y={t.transform?.y}
          width={t.width ?? 80} height={t.height ?? 30}
          fill="none" stroke="#2563eb"
          strokeWidth={1} opacity={0.7}
          strokeDasharray="4 2"
          pointerEvents="none"
          className="ghost-element"
        />
      )
    }
    default:
      return null
  }
}
