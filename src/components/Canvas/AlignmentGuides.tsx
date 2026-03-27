import { useDrawingStore } from '../../store/useDrawingStore'

export function AlignmentGuides() {
  const guides = useDrawingStore((s) => s.alignmentGuides)
  const { width, height, zoom } = useDrawingStore((s) => s.canvas)

  if (guides.length === 0) return null

  // Extend guides beyond canvas edges for better visibility
  const ext = 2000
  const sw = 1 / zoom // 1px screen-space regardless of zoom

  return (
    <g pointerEvents="none" className="alignment-guides">
      {guides.map((g, i) =>
        g.orientation === 'vertical' ? (
          <line
            key={i}
            x1={g.position} y1={-ext}
            x2={g.position} y2={height + ext}
            stroke="#06b6d4"
            strokeWidth={sw}
          />
        ) : (
          <line
            key={i}
            x1={-ext} y1={g.position}
            x2={width + ext} y2={g.position}
            stroke="#06b6d4"
            strokeWidth={sw}
          />
        )
      )}
    </g>
  )
}
