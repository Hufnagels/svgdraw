import type { DrawingElement } from '../types/elements'
import type { CanvasSettings } from '../store/useDrawingStore'
import { exportSVG } from '../components/ExportDialog/SVGExporter'
import { svgToJPGDataUrl } from '../components/ExportDialog/JPGExporter'
import { pxToMm } from './units'

export const FILE_EXTENSION = 'label'
export const FILE_MIME = 'application/x-label+json'
export const FORMAT_VERSION = 1

const THUMB_MAX = 320  // max width or height in pixels

export interface LabelDocument {
  version: number
  meta: {
    name: string
    created: string   // ISO 8601
    modified: string  // ISO 8601
    thumbnail?: string // base64 JPEG data URL
  }
  canvas: Pick<CanvasSettings, 'widthMm' | 'heightMm' | 'dpi' | 'width' | 'height' | 'backgroundColor' | 'showGrid' | 'snapToElements' | 'snapThreshold' | 'borderRadius'>
  elements: Record<string, DrawingElement>
  zOrder: string[]
}

async function generateThumbnail(svgEl: SVGSVGElement, canvas: CanvasSettings): Promise<string> {
  const scale = Math.min(1, THUMB_MAX / canvas.width, THUMB_MAX / canvas.height)
  const tw = Math.round(canvas.width  * scale)
  const th = Math.round(canvas.height * scale)
  const svgStr = exportSVG(svgEl, canvas)
  return svgToJPGDataUrl(svgStr, tw, th, canvas.backgroundColor, 0.80)
}

export async function serializeDocument(
  name: string,
  canvas: CanvasSettings,
  elements: Record<string, DrawingElement>,
  zOrder: string[],
  svgEl?: SVGSVGElement,
): Promise<string> {
  const now = new Date().toISOString()

  const thumbnail = svgEl ? await generateThumbnail(svgEl, canvas).catch(() => undefined) : undefined

  const doc: LabelDocument = {
    version: FORMAT_VERSION,
    meta: { name, created: now, modified: now, ...(thumbnail ? { thumbnail } : {}) },
    canvas: {
      widthMm:         canvas.widthMm,
      heightMm:        canvas.heightMm,
      dpi:             canvas.dpi,
      width:           canvas.width,
      height:          canvas.height,
      backgroundColor: canvas.backgroundColor,
      showGrid:        canvas.showGrid,
      snapToElements:  canvas.snapToElements,
      snapThreshold:   canvas.snapThreshold,
      borderRadius:    canvas.borderRadius,
    },
    elements,
    zOrder,
  }
  return JSON.stringify(doc, null, 2)
}

export function deserializeDocument(json: string): LabelDocument {
  let doc: unknown
  try {
    doc = JSON.parse(json)
  } catch {
    throw new Error('Invalid file: not valid JSON.')
  }

  if (typeof doc !== 'object' || doc === null) throw new Error('Invalid file: expected an object.')
  const d = doc as Record<string, unknown>

  if (d.version !== FORMAT_VERSION) {
    throw new Error(`Unsupported file version: ${d.version}. Expected ${FORMAT_VERSION}.`)
  }
  if (typeof d.elements !== 'object' || d.elements === null) throw new Error('Invalid file: missing elements.')
  if (!Array.isArray(d.zOrder)) throw new Error('Invalid file: missing zOrder.')

  // Backwards compat: derive mm from px for files saved before mm fields existed
  const c = d.canvas as Record<string, unknown>
  if (!c.dpi)      c.dpi      = 203
  if (!c.widthMm)  c.widthMm  = pxToMm(c.width  as number, c.dpi as number)
  if (!c.heightMm) c.heightMm = pxToMm(c.height as number, c.dpi as number)

  return doc as LabelDocument
}

export function downloadDocument(filename: string, json: string) {
  const blob = new Blob([json], { type: FILE_MIME })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.${FILE_EXTENSION}`
  a.click()
  URL.revokeObjectURL(url)
}
