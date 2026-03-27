import { useDrawingStore } from '../../store/useDrawingStore'
import { getSelectionBBox, getRawBBox } from '../../utils/geometry'
import { ResizeHandle } from './ResizeHandle'
import type { ResizeHandle as ResizeHandleType } from '../../types/interaction'

const ROTATE_OFFSET = 24
const HANDLE_SIZE = 8

interface Props {
  selectedIds: string[]
  zoom: number
}

export function SelectionBox({ selectedIds, zoom }: Props) {
  const elements = useDrawingStore((s) => s.elements)
  if (selectedIds.length === 0) return null

  const bbox = getSelectionBBox(selectedIds, elements)
  if (bbox.width === 0 && bbox.height === 0) return null

  const handleSize = HANDLE_SIZE / zoom
  const rotateOffset = ROTATE_OFFSET / zoom
  const strokeWidth = 1.5 / zoom
  const dashSize = 4 / zoom

  const singleEl = selectedIds.length === 1 ? elements[selectedIds[0]] : null
  const isSingleNonLine = singleEl !== null && singleEl.type !== 'line'
  const rotation = isSingleNonLine ? singleEl.transform.rotation : 0

  // For single element: use raw (unrotated) bbox and apply SVG rotation transform.
  // For multi-selection: use axis-aligned union bbox without rotation.
  const displayBbox = isSingleNonLine ? getRawBBox(singleEl, elements) : bbox
  const groupTransform = (isSingleNonLine && rotation !== 0)
    ? `rotate(${rotation} ${displayBbox.cx} ${displayBbox.cy})`
    : undefined

  const handles: Array<{ h: ResizeHandleType; x: number; y: number }> = [
    { h: 'nw', x: displayBbox.x,     y: displayBbox.y      },
    { h: 'n',  x: displayBbox.cx,    y: displayBbox.y      },
    { h: 'ne', x: displayBbox.right, y: displayBbox.y      },
    { h: 'w',  x: displayBbox.x,     y: displayBbox.cy     },
    { h: 'e',  x: displayBbox.right, y: displayBbox.cy     },
    { h: 'sw', x: displayBbox.x,     y: displayBbox.bottom },
    { h: 's',  x: displayBbox.cx,    y: displayBbox.bottom },
    { h: 'se', x: displayBbox.right, y: displayBbox.bottom },
  ]

  const rotHandleY = displayBbox.y - rotateOffset

  return (
    <g pointerEvents="none" className="selection-overlay" transform={groupTransform}>
      {/* Selection border */}
      <rect
        x={displayBbox.x}
        y={displayBbox.y}
        width={displayBbox.width}
        height={displayBbox.height}
        fill="none"
        stroke="#2563eb"
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashSize} ${dashSize * 0.5}`}
      />

      {/* Resize handles — pointer events enabled */}
      <g pointerEvents="all">
        {handles.map(({ h, x, y }) => (
          <ResizeHandle key={h} position={h} x={x} y={y} size={handleSize} />
        ))}
      </g>

      {/* Rotate handle */}
      {isSingleNonLine && (
        <g pointerEvents="all">
          <line
            x1={displayBbox.cx} y1={displayBbox.y}
            x2={displayBbox.cx} y2={rotHandleY}
            stroke="#2563eb"
            strokeWidth={strokeWidth}
          />
          <circle
            data-rotate-handle="true"
            cx={displayBbox.cx}
            cy={rotHandleY}
            r={handleSize / 2}
            fill="white"
            stroke="#2563eb"
            strokeWidth={strokeWidth}
            style={{ cursor: 'grab' }}
          />
        </g>
      )}
    </g>
  )
}
