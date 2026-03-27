import type { RectElement as RectEl } from '../../types/elements'

interface Props {
  el: RectEl
  onMouseDown?: (e: React.MouseEvent) => void
}

export function RectElement({ el, onMouseDown }: Props) {
  const { transform, style, width, height, rx, ry } = el
  const cx = transform.x + width / 2
  const cy = transform.y + height / 2
  return (
    <rect
      data-element-id={el.id}
      x={transform.x}
      y={transform.y}
      width={width}
      height={height}
      rx={rx}
      ry={ry}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      opacity={style.opacity}
      strokeDasharray={style.strokeDasharray}
      transform={transform.rotation ? `rotate(${transform.rotation} ${cx} ${cy})` : undefined}
      onMouseDown={onMouseDown}
      style={{ cursor: 'move' }}
    />
  )
}
