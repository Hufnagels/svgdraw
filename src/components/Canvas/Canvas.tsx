import { useRef, useEffect, useCallback, useState } from 'react'
import { useDrawingStore } from '../../store/useDrawingStore'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { CanvasBackground } from './CanvasBackground'
import { ElementRenderer } from '../Elements/ElementRenderer'
import { SelectionBox } from '../Selection/SelectionBox'
import { AlignmentGuides } from './AlignmentGuides'
import { GhostElement } from './GhostElement'

export function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp, interaction } = useCanvasInteraction(svgRef)

  const elements = useDrawingStore((s) => s.elements)
  const zOrder = useDrawingStore((s) => s.zOrder)
  const selectedIds = useDrawingStore((s) => s.selectedIds)
  const canvas = useDrawingStore((s) => s.canvas)
  const activeTool = useDrawingStore((s) => s.activeTool)
  const defaultStyle = useDrawingStore((s) => s.defaultStyle)
  const { width, height, zoom, panX, panY, showGrid, backgroundColor, borderRadius } = canvas

  const updateCanvas = useDrawingStore((s) => s.updateCanvas)

  const [showZoomPopover, setShowZoomPopover] = useState(false)
  const prevSizeRef = useRef<{ w: number; h: number } | null>(null)

  const fitCanvas = useCallback((containerW?: number, containerH?: number) => {
    const el = svgRef.current
    if (!el) return
    const w = containerW ?? el.getBoundingClientRect().width
    const h = containerH ?? el.getBoundingClientRect().height
    const pad = 40
    const fitZoom = Math.min(4, Math.max(0.05, Math.min((w - pad * 2) / width, (h - pad * 2) / height)))
    updateCanvas({ zoom: fitZoom, panX: (w - width * fitZoom) / 2, panY: (h - height * fitZoom) / 2 })
  }, [width, height, updateCanvas])

  // ResizeObserver: fit on first measurement, re-fit after resize ends (debounced)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver((entries) => {
      const { width: newW, height: newH } = entries[0].contentRect
      if (!prevSizeRef.current) {
        // Initial measurement — fit immediately
        fitCanvas(newW, newH)
        prevSizeRef.current = { w: newW, h: newH }
        return
      }
      // Debounce: re-fit only after resizing stops
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        prevSizeRef.current = { w: newW, h: newH }
        fitCanvas(newW, newH)
      }, 250)
    })
    observer.observe(el)
    return () => { observer.disconnect(); if (timer) clearTimeout(timer) }
  }, [fitCanvas])

  function setZoomToCenter(newZoom: number) {
    const el = svgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    updateCanvas({
      zoom: newZoom,
      panX: cx - (cx - panX) * (newZoom / zoom),
      panY: cy - (cy - panY) * (newZoom / zoom),
    })
  }

  // Keyboard events for panning
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const rect = svgRef.current!.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
      const newZoom = Math.min(8, Math.max(0.1, zoom * zoomFactor))

      // Zoom towards mouse position
      const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom)
      const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom)

      updateCanvas({ zoom: newZoom, panX: newPanX, panY: newPanY })
    },
    [zoom, panX, panY, updateCanvas]
  )

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Rubber-band selection rect
  const showRubberBand = interaction.mode === 'rect_select'
  const rubberBand = showRubberBand
    ? {
        x: Math.min(interaction.startX, interaction.currentX),
        y: Math.min(interaction.startY, interaction.currentY),
        width: Math.abs(interaction.currentX - interaction.startX),
        height: Math.abs(interaction.currentY - interaction.startY),
      }
    : null

  // Freehand preview path
  const freehandPath =
    interaction.mode === 'freehand_drawing' && interaction.points.length > 1
      ? 'M ' + interaction.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
      : null

  const toolCursors: Record<string, string> = {
    select: 'default',
    circle: 'crosshair',
    rect: 'crosshair',
    line: 'crosshair',
    text: 'text',
    image: 'default',
    barcode: 'default',
    qr: 'default',
    freehand: 'crosshair',
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg
        ref={svgRef}
        data-drawing-canvas="true"
        width="100%"
        height="100%"
        style={{ cursor: toolCursors[activeTool] ?? 'default', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Zoom/pan transform group */}
        <g
          data-canvas-root="true"
          transform={`translate(${panX},${panY}) scale(${zoom})`}
        >
          <CanvasBackground
            width={width}
            height={height}
            showGrid={showGrid}
            backgroundColor={backgroundColor}
            borderRadius={borderRadius}
          />

          {/* Drawing content — clipped to rounded canvas shape when borderRadius > 0 */}
          <g clipPath={borderRadius > 0 ? 'url(#canvas-clip)' : undefined}>
            {/* Render all root-level elements */}
            {zOrder
              .filter((id) => {
                const el = elements[id]
                return el && !el.parentId
              })
              .map((id) => {
                const el = elements[id]
                if (!el) return null
                return (
                  <ElementRenderer
                    key={id}
                    el={el}
                    elements={elements}
                    onMouseDown={handleMouseDown}
                  />
                )
              })}

            {/* Ghost element during creation */}
            <GhostElement />

            {/* Freehand drawing preview */}
            {freehandPath && (
              <path
                d={freehandPath}
                fill="none"
                stroke={defaultStyle.stroke}
                strokeWidth={defaultStyle.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
                pointerEvents="none"
                className="ghost-element"
              />
            )}
          </g>

          {/* Alignment guides */}
          <AlignmentGuides />

          {/* Rubber-band selection */}
          {rubberBand && (
            <rect
              x={rubberBand.x} y={rubberBand.y}
              width={rubberBand.width} height={rubberBand.height}
              fill="rgba(37, 99, 235, 0.08)"
              stroke="#2563eb"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom} ${2 / zoom}`}
              pointerEvents="none"
            />
          )}

          {/* Selection box */}
          <SelectionBox selectedIds={selectedIds} zoom={zoom} />
        </g>
      </svg>

      {/* Zoom badge + popover */}
      <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
        {showZoomPopover && (
          <>
            {/* Backdrop to close */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowZoomPopover(false)} />
            <div style={{
              position: 'absolute', bottom: 36, right: 0, zIndex: 100,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              width: 180,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}>
              {/* Percentage label */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zoom</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              {/* Slider */}
              <input
                type="range"
                min={5} max={400} step={5}
                value={Math.round(zoom * 100)}
                onChange={(e) => setZoomToCenter(parseInt(e.target.value) / 100)}
                style={{ width: '100%', accentColor: '#2563eb', marginBottom: 10 }}
              />
              {/* Quick buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[50, 100, 200].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setZoomToCenter(pct / 100)}
                    style={{
                      flex: 1, padding: '3px 0', fontSize: 11,
                      background: Math.round(zoom * 100) === pct ? '#2563eb' : 'var(--bg-input)',
                      color: Math.round(zoom * 100) === pct ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
                    }}
                  >{pct}%</button>
                ))}
                <button
                  onClick={() => { fitCanvas(); setShowZoomPopover(false) }}
                  style={{
                    flex: 1, padding: '3px 0', fontSize: 11,
                    background: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
                  }}
                >Fit</button>
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => setShowZoomPopover((o) => !o)}
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'var(--text-secondary)',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace',
            backdropFilter: 'blur(4px)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </div>
  )
}
