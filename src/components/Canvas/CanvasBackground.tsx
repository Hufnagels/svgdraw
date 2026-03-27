interface Props {
  width: number
  height: number
  showGrid: boolean
  backgroundColor: string
  borderRadius: number
}

export function CanvasBackground({ width, height, showGrid, backgroundColor, borderRadius }: Props) {
  const rx = borderRadius > 0 ? borderRadius : undefined
  return (
    <>
      <defs>
        <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
        </pattern>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#smallGrid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#cbd5e1" strokeWidth={1} />
        </pattern>
        {rx !== undefined && (
          <clipPath id="canvas-clip">
            <rect x={0} y={0} width={width} height={height} rx={rx} ry={rx} />
          </clipPath>
        )}
      </defs>
      {/* Canvas background */}
      <rect x={0} y={0} width={width} height={height} rx={rx} ry={rx} fill={backgroundColor} />
      {/* Grid (clipped to rounded shape) */}
      {showGrid && (
        <rect
          x={0} y={0} width={width} height={height}
          rx={rx} ry={rx}
          fill="url(#grid)"
          className="grid-overlay"
          clipPath={rx !== undefined ? 'url(#canvas-clip)' : undefined}
        />
      )}
      {/* Canvas border */}
      <rect x={0} y={0} width={width} height={height} rx={rx} ry={rx} fill="none" stroke="var(--text-secondary)" strokeWidth={1} />
    </>
  )
}
