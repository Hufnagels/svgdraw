import type { ImageElement as ImageEl } from '../../types/elements'

interface Props {
  el: ImageEl
  onMouseDown?: (e: React.MouseEvent) => void
}

export function ImageElement({ el, onMouseDown }: Props) {
  const { transform, style, href, width, height } = el
  const cx = transform.x + width / 2
  const cy = transform.y + height / 2
  return (
    <image
      data-element-id={el.id}
      x={transform.x}
      y={transform.y}
      width={width}
      height={height}
      href={href}
      opacity={style.opacity}
      transform={transform.rotation ? `rotate(${transform.rotation} ${cx} ${cy})` : undefined}
      onMouseDown={onMouseDown}
      style={{ cursor: 'move' }}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}
