import type { FreehandElement as FreehandEl } from '../../types/elements'

interface Props {
  el: FreehandEl
  onMouseDown?: (e: React.MouseEvent) => void
}

export function FreehandElement({ el, onMouseDown }: Props) {
  const { pathData, style } = el
  return (
    <path
      data-element-id={el.id}
      d={pathData}
      fill={style.fill ?? 'none'}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={style.opacity}
      onMouseDown={onMouseDown}
      style={{ cursor: 'move' }}
    />
  )
}
