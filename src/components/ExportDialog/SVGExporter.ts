import type { CanvasSettings } from '../../store/useDrawingStore'

export function exportSVG(svgEl: SVGSVGElement, canvas: CanvasSettings): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement

  // Remove interaction-only and UI-guide elements
  clone.querySelectorAll('.selection-overlay, .alignment-guides, .ghost-element, .grid-overlay').forEach((el) => el.remove())

  // Reset dimensions and viewBox to the canvas dimensions
  clone.setAttribute('width', String(canvas.width))
  clone.setAttribute('height', String(canvas.height))
  clone.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  // Reset the root canvas group (remove zoom/pan transform)
  const rootG = clone.querySelector('[data-canvas-root="true"]') as SVGGElement | null
  if (rootG) rootG.removeAttribute('transform')

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(clone)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svgStr}`
}

export function downloadSVG(svgEl: SVGSVGElement, canvas: CanvasSettings, filename = 'drawing.svg') {
  const svgStr = exportSVG(svgEl, canvas)
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
