import type {
  DrawingElement, RectElement, CircleElement, LineElement,
  TextElement, BarcodeElement, QRElement, GroupElement,
} from '../types/elements'
import type { CanvasSettings } from '../store/useDrawingStore'

export type ZplDPI = 203 | 300

export interface ZPLOptions { dpi: ZplDPI }

// ── helpers ──────────────────────────────────────────────────────────────────

function d(px: number, dpi: number) { return Math.round(px * dpi / 96) }

function hexToZplColor(hex: string): 'B' | 'W' {
  if (!hex || hex === 'none' || hex === 'transparent') return 'B'
  const clean = hex.replace('#', '')
  if (clean.length < 6) return 'B'
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128 ? 'B' : 'W'
}

function fdSafe(text: string) {
  return text.replace(/\^/g, '\\^').replace(/~/g, '\\~')
}

// ── element converters ────────────────────────────────────────────────────────

function rectToZpl(el: RectElement, dpi: number): string[] {
  const lines: string[] = []
  const x = d(el.transform.x, dpi), y = d(el.transform.y, dpi)
  const w = d(el.width, dpi),       h = d(el.height, dpi)
  const rounding = el.rx > 0 ? Math.min(8, Math.round((el.rx / Math.min(el.width, el.height)) * 8)) : 0

  if (el.style.fill && el.style.fill !== 'none' && el.style.fill !== 'transparent') {
    if (hexToZplColor(el.style.fill) === 'B') {
      lines.push(`^FO${x},${y}^GB${w},${h},${Math.min(w, h)},B,${rounding}^FS`)
    }
    // white fill = paper colour, skip
  }
  if (el.style.stroke && el.style.stroke !== 'none' && el.style.strokeWidth > 0) {
    const sw = Math.max(1, d(el.style.strokeWidth, dpi))
    const col = hexToZplColor(el.style.stroke)
    lines.push(`^FO${x},${y}^GB${w},${h},${sw},${col},${rounding}^FS`)
  }
  return lines
}

function circleToZpl(el: CircleElement, dpi: number): string[] {
  const lines: string[] = []
  const x = d(el.transform.x - el.rx, dpi), y = d(el.transform.y - el.ry, dpi)
  const w = d(el.rx * 2, dpi),              h = d(el.ry * 2, dpi)

  if (el.style.fill && el.style.fill !== 'none') {
    if (hexToZplColor(el.style.fill) === 'B')
      lines.push(`^FO${x},${y}^GB${w},${h},${Math.min(w, h)},B,8^FS`)
  }
  if (el.style.stroke && el.style.stroke !== 'none' && el.style.strokeWidth > 0) {
    const sw = Math.max(1, d(el.style.strokeWidth, dpi))
    lines.push(`^FO${x},${y}^GB${w},${h},${sw},${hexToZplColor(el.style.stroke)},8^FS`)
  }
  return lines
}

function lineToZpl(el: LineElement, dpi: number): string[] {
  if (!el.style.stroke || el.style.stroke === 'none' || el.style.strokeWidth === 0) return []
  const sw = Math.max(1, d(el.style.strokeWidth, dpi))
  const col = hexToZplColor(el.style.stroke)
  const half = el.style.strokeWidth / 2
  const isHorizontal = Math.abs(el.y2 - el.y1) <= Math.abs(el.x2 - el.x1)
  if (isHorizontal) {
    // y1/y2 are the line's centerline; ZPL ^FO expects the top-left of the bounding box
    const lx = d(Math.min(el.x1, el.x2), dpi)
    const ly = d(Math.min(el.y1, el.y2) - half, dpi)
    const lw = Math.max(1, d(Math.abs(el.x2 - el.x1), dpi))
    return [`^FO${lx},${ly}^GB${lw},${sw},${sw},${col},0^FS`]
  } else {
    // x1/x2 are the line's centerline
    const lx = d(Math.min(el.x1, el.x2) - half, dpi)
    const ly = d(Math.min(el.y1, el.y2), dpi)
    const lh = Math.max(1, d(Math.abs(el.y2 - el.y1), dpi))
    return [`^FO${lx},${ly}^GB${sw},${lh},${sw},${col},0^FS`]
  }
}

function textToZpl(el: TextElement, dpi: number): string[] {
  const x  = d(el.transform.x, dpi), y = d(el.transform.y, dpi)
  const fh = Math.max(10, d(el.fontSize, dpi))
  const fw = Math.round(fh * 0.6)
  const tw = d(el.width, dpi)
  const justifyMap: Record<string, string> = { start: 'L', middle: 'C', end: 'R' }
  const justify = justifyMap[el.textAnchor] ?? 'L'
  // ^A0N = built-in scalable font, Normal orientation
  return [`^FO${x},${y}^A0N,${fh},${fw}^FB${tw},1,0,${justify}^FD${fdSafe(el.content)}^FS`]
}

function barcodeToZpl(el: BarcodeElement, dpi: number): string[] {
  const x  = d(el.transform.x, dpi), y = d(el.transform.y, dpi)
  const h  = d(el.height, dpi)
  const pi = el.includeText ? 'Y' : 'N'
  switch (el.symbology) {
    case 'code128': return [`^FO${x},${y}^BCN,${h},${pi},N,N^FD${fdSafe(el.data)}^FS`]
    case 'code39':  return [`^FO${x},${y}^B3N,N,${h},${pi},N^FD${fdSafe(el.data)}^FS`]
    case 'ean13':   return [`^FO${x},${y}^BEN,${h},${pi}^FD${fdSafe(el.data)}^FS`]
    case 'ean8':    return [`^FO${x},${y}^B8N,${h},${pi}^FD${fdSafe(el.data)}^FS`]
    case 'upca':    return [`^FO${x},${y}^BUNN,${h},${pi}^FD${fdSafe(el.data)}^FS`]
    case 'upce':    return [`^FO${x},${y}^BUEN,${h},${pi}^FD${fdSafe(el.data)}^FS`]
    case 'pdf417':  return [`^FO${x},${y}^B7N,${h},0,0,0^FD${fdSafe(el.data)}^FS`]
    default:        return [`; Unsupported barcode symbology: ${el.symbology}`]
  }
}

function qrToZpl(el: QRElement, dpi: number): string[] {
  const x   = d(el.transform.x, dpi), y = d(el.transform.y, dpi)
  const eccMap: Record<string, string> = { L: '1', M: '2', Q: '3', H: '4' }
  const ecc = eccMap[el.ecc] ?? '2'
  const mag = Math.max(1, Math.min(10, Math.round(d(el.width, dpi) / 29)))
  return [`^FO${x},${y}^BQN,2,${mag},${ecc}^FD${ecc}A,${fdSafe(el.data)}^FS`]
}

// ── main export ───────────────────────────────────────────────────────────────

export function convertToZPL(
  elements: Record<string, DrawingElement>,
  zOrder: string[],
  canvas: CanvasSettings,
  options: ZPLOptions = { dpi: 203 },
): string {
  const { dpi } = options
  const lw = d(canvas.width,  dpi)
  const lh = d(canvas.height, dpi)

  const lines: string[] = [
    '^XA',
    `^PW${lw}`,
    `^LL${lh}`,
    '^CI28',
    '',
  ]

  // Dark canvas background
  if (canvas.backgroundColor && hexToZplColor(canvas.backgroundColor) === 'B') {
    lines.push(`^FO0,0^GB${lw},${lh},${Math.min(lw, lh)},B,0^FS`)
  }

  function renderEl(id: string) {
    const el = elements[id]
    if (!el || !el.visible) return
    if (el.type === 'group') {
      ;(el as GroupElement).childIds.forEach(renderEl)
      return
    }
    let elLines: string[] = []
    switch (el.type) {
      case 'rect':    elLines = rectToZpl(el as RectElement,     dpi); break
      case 'circle':  elLines = circleToZpl(el as CircleElement, dpi); break
      case 'line':    elLines = lineToZpl(el as LineElement,     dpi); break
      case 'text':    elLines = textToZpl(el as TextElement,     dpi); break
      case 'barcode': elLines = barcodeToZpl(el as BarcodeElement, dpi); break
      case 'qr':      elLines = qrToZpl(el as QRElement,         dpi); break
      default: elLines = [`; ${el.type} not supported in ZPL`]
    }
    elLines.forEach((l) => lines.push(l))
  }

  zOrder.forEach(renderEl)

  lines.push('')
  lines.push('^XZ')
  return lines.join('\n')
}

export function downloadZPL(filename: string, zpl: string) {
  const blob = new Blob([zpl], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}.zpl`
  a.click()
  URL.revokeObjectURL(url)
}
