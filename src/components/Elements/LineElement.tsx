import type { LineElement as LineEl } from '../../types/elements'

interface Props {
  el: LineEl
  onMouseDown?: (e: React.MouseEvent) => void
}

export function LineElement({ el, onMouseDown }: Props) {
  const { x1, y1, x2, y2, style } = el
  return (
    <>
      <defs>
        {el.markerEnd === 'arrow' && (
          <marker id={`arrow-end-${el.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={style.stroke} />
          </marker>
        )}
        {el.markerStart === 'arrow' && (
          <marker id={`arrow-start-${el.id}`} markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill={style.stroke} />
          </marker>
        )}
      </defs>
      <line
        data-element-id={el.id}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
        strokeDasharray={style.strokeDasharray}
        markerEnd={el.markerEnd === 'arrow' ? `url(#arrow-end-${el.id})` : undefined}
        markerStart={el.markerStart === 'arrow' ? `url(#arrow-start-${el.id})` : undefined}
        onMouseDown={onMouseDown}
        style={{ cursor: 'move' }}
      />
      {/* Invisible wider hit area */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="transparent"
        strokeWidth={Math.max(style.strokeWidth + 8, 12)}
        onMouseDown={onMouseDown}
        style={{ cursor: 'move' }}
      />
    </>
  )
}
