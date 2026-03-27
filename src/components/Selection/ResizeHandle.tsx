import type { ResizeHandle as ResizeHandleType } from '../../types/interaction'

interface Props {
  position: ResizeHandleType
  x: number
  y: number
  size: number
}

const cursors: Record<ResizeHandleType, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  w: 'w-resize', e: 'e-resize',
  sw: 'sw-resize', s: 's-resize', se: 'se-resize',
}

export function ResizeHandle({ position, x, y, size }: Props) {
  const half = size / 2
  return (
    <rect
      data-resize-handle={position}
      x={x - half}
      y={y - half}
      width={size}
      height={size}
      fill="white"
      stroke="#2563eb"
      strokeWidth={1.5}
      style={{ cursor: cursors[position] }}
      rx={1}
    />
  )
}
