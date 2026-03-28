import { useDrawingStore } from '../../store/useDrawingStore'

export function AlignmentGuides() {
  const guides = useDrawingStore((s) => s.alignmentGuides)
  const { width, height, zoom } = useDrawingStore((s) => s.canvas)

  if (guides.length === 0) return null

  const ext = 2000
  const sw = 1 / zoom
  const color = 'rgb(0, 161, 255)'
  const dash = `${6 / zoom},${3 / zoom}`
  const r = 4 / zoom // snap-point indicator radius

  // Intersection points of vertical × horizontal guides
  const vGuides = guides.filter((g) => g.orientation === 'vertical')
  const hGuides = guides.filter((g) => g.orientation === 'horizontal')
  const intersections: Array<{ x: number; y: number }> = []
  for (const v of vGuides) {
    for (const h of hGuides) {
      intersections.push({ x: v.position, y: h.position })
    }
  }

  return (
    <g pointerEvents="none" className="alignment-guides">
      {vGuides.map((g, i) => (
        <line
          key={`v${i}`}
          x1={g.position} y1={-ext}
          x2={g.position} y2={height + ext}
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={dash}
        />
      ))}
      {hGuides.map((g, i) => (
        <line
          key={`h${i}`}
          x1={-ext} y1={g.position}
          x2={width + ext} y2={g.position}
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={dash}
        />
      ))}
      {intersections.map((pt, i) => (
        <circle
          key={`pt${i}`}
          cx={pt.x} cy={pt.y} r={r}
          fill={color}
        />
      ))}
    </g>
  )
}
