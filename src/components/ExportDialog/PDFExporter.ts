import jsPDF from 'jspdf'
import 'svg2pdf.js'
import { exportSVG } from './SVGExporter'
import type { CanvasSettings } from '../../store/useDrawingStore'

const PX_TO_MM = 25.4 / 96

export async function downloadPDF(
  svgEl: SVGSVGElement,
  canvas: CanvasSettings,
  filename = 'drawing.pdf'
): Promise<void> {
  const wMm = canvas.width * PX_TO_MM
  const hMm = canvas.height * PX_TO_MM
  const orientation = wMm > hMm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [wMm, hMm],
  })

  // Get a clean SVG clone
  const svgStr = exportSVG(svgEl, canvas)
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgStr, 'image/svg+xml')
  const cleanSVG = doc.documentElement as unknown as SVGSVGElement

  await (pdf as unknown as { svg: (el: SVGSVGElement, opts: object) => Promise<void> }).svg(cleanSVG, {
    x: 0,
    y: 0,
    width: wMm,
    height: hMm,
  })

  pdf.save(filename)
}
