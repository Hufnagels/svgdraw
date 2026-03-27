import type { CircleElement as CircleEl } from '../../types/elements'

interface Props {
  el: CircleEl
  onMouseDown?: (e: React.MouseEvent) => void
}

export function CircleElement({ el, onMouseDown }: Props) {
  const { transform, style, rx, ry } = el
  return (
    <ellipse
      data-element-id={el.id}
      cx={transform.x}
      cy={transform.y}
      rx={rx}
      ry={ry}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      opacity={style.opacity}
      strokeDasharray={style.strokeDasharray}
      transform={transform.rotation ? `rotate(${transform.rotation} ${transform.x} ${transform.y})` : undefined}
      onMouseDown={onMouseDown}
      style={{ cursor: 'move' }}
    />
  )
}
