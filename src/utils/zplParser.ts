import type {
  DrawingElement, RectElement, CircleElement, LineElement,
  TextElement, BarcodeElement, QRElement, BarcodeSymbology,
} from '../types/elements'
import type { DPI } from './units'
import { generateId } from './idGenerator'
import { DEFAULT_CANVAS_SETTINGS } from '../store/useTabsStore'

export interface ZPLParseResult {
  widthMm: number
  heightMm: number
  elements: Record<string, DrawingElement>
  zOrder: string[]
}

// ── Internal block types ──────────────────────────────────────────────────────

interface GBBlock {
  kind: 'gb'
  x: number; y: number; w: number; h: number; t: number
  color: string; rounding: number
  fillColor?: string   // set after merging fill+stroke pair
}
interface TextBlock { kind: 'text'; x: number; y: number; fontH: number; fbW: number; justify: string; data: string }
interface BcBlock   { kind: 'bc';   x: number; y: number; cmd: string; h: number; includeText: boolean; data: string }
interface QRBlock   { kind: 'qr';   x: number; y: number; mag: number; ecc: string; data: string }
type Block = GBBlock | TextBlock | BcBlock | QRBlock

// ─────────────────────────────────────────────────────────────────────────────

// Normalise "BC" or "BCN" → "BCN" for symbology lookup
const BARCODE_SYM: Record<string, BarcodeSymbology> = {
  BCN: 'code128', B3N: 'code39', BEN: 'ean13',
  B8N: 'ean8', BUNN: 'upca', BUEN: 'upce', B7N: 'pdf417',
}
const QR_ECC: Record<string, 'L'|'M'|'Q'|'H'> = { '1': 'L', '2': 'M', '3': 'Q', '4': 'H' }

const colorHex = (c: string) => c.trim() === 'W' ? '#ffffff' : '#000000'
const baseStyle = { opacity: 1 as const, strokeDasharray: undefined as undefined }

// Match any ^A0 font variant: A0N / A0R / A0B / A0I / A0 (no orientation)
const A0_RE  = /^A0[NRBI]?,(\d+)/
// Match barcode commands with or without orientation suffix:
// BC/BCN, B3/B3N, BE/BEN, B8/B8N, B7/B7N, BUN/BUNN, BUE/BUEN
const BC_RE  = /^(BUNN?|BUEN?|B[C38E7]N?)/

export function parseZPL(zpl: string, dpi: DPI): ZPLParseResult {
  const toPx = (dots: number) => dots * 96 / dpi

  // ── 1. Canvas dimensions ─────────────────────────────────────────────────
  const pwM = zpl.match(/\^PW(\d+)/), llM = zpl.match(/\^LL(\d+)/)
  const wDots = pwM ? parseInt(pwM[1]) : 0
  const hDots = llM ? parseInt(llM[1]) : 0
  const widthMm  = wDots ? Math.round(toPx(wDots)  * 25.4 / dpi * 10) / 10 : DEFAULT_CANVAS_SETTINGS.widthMm
  const heightMm = hDots ? Math.round(toPx(hDots) * 25.4 / dpi * 10) / 10 : DEFAULT_CANVAS_SETTINGS.heightMm

  // ── 2. Tokenize and collect raw blocks ───────────────────────────────────
  const raw: Block[] = []

  let curX = 0, curY = 0, hasFO = false
  // globalFontH: set by ^CF, persists across fields
  let globalFontH = 0
  let fontH = 10, fbW = 0, justify = 'L', hasFont = false, hasFB = false
  let bcCmd = '', bcH = 50, bcIncludeText = false, hasBc = false
  let qrMag = 1, qrEcc = '2', hasQR = false

  for (const rawToken of zpl.split('^')) {
    const t = rawToken.trim()
    if (!t) continue

    // ── Field origin ───────────────────────────────────────────────────────
    if (t.startsWith('FO')) {
      const [xS, yS] = t.slice(2).split(',')
      curX = parseInt(xS) || 0; curY = parseInt(yS) || 0
      hasFO = true; hasFont = hasFB = hasBc = hasQR = false
    }

    // ── Graphic box ────────────────────────────────────────────────────────
    else if (t.startsWith('GB') && hasFO) {
      const [wS, hS, tS, col, rS] = t.slice(2).split(',')
      raw.push({
        kind: 'gb', x: curX, y: curY,
        w: parseInt(wS) || 0, h: parseInt(hS) || 0, t: parseInt(tS) || 0,
        color: col || 'B', rounding: parseInt(rS) || 0,
      })
    }

    // ── Change font — sets label-wide default height (^CF{font},{h},{w}) ──
    else if (t.startsWith('CF')) {
      const m = t.match(/^CF\w,(\d+)/)
      if (m) globalFontH = parseInt(m[1]) || globalFontH
    }

    // ── Scalable font ^A0{orientation?},{fh},{fw} ──────────────────────────
    // Handles A0N / A0R / A0B / A0I / A0 (no orientation letter)
    else if (hasFO && A0_RE.test(t)) {
      const m = t.match(A0_RE)!
      fontH = parseInt(m[1]); hasFont = true
    }

    // ── Field block (width + justification) ───────────────────────────────
    else if (t.startsWith('FB') && hasFO) {
      const parts = t.slice(2).split(',')
      fbW = parseInt(parts[0]) || 100
      justify = parts[3]?.trim() || 'L'
      hasFB = true
    }

    // ── Barcode commands — with OR without orientation letter ──────────────
    // Covers: BC/BCN, B3/B3N, BE/BEN, B8/B8N, B7/B7N, BUN/BUNN, BUE/BUEN
    else if (hasFO && BC_RE.test(t)) {
      const cmd = t.match(BC_RE)![1]
      const p = t.slice(cmd.length).split(',')
      // p[0]='' (starts with ','), p[1..] = params
      bcCmd = cmd.endsWith('N') ? cmd : cmd + 'N'
      if (cmd.startsWith('B3')) {
        // ^B3[N],{checkDigit},{h},{printLine}
        bcH = parseInt(p[2]) || 50; bcIncludeText = p[3]?.trim() === 'Y'
      } else if (cmd.startsWith('B7')) {
        bcH = parseInt(p[1]) || 50; bcIncludeText = false
      } else {
        // BC, BE, B8, BUN, BUE: ^Bcmd,{h},{printLine}
        bcH = parseInt(p[1]) || 50; bcIncludeText = p[2]?.trim() === 'Y'
      }
      hasBc = true
    }

    // ── QR code ^BQ[N],2,{mag},{ecc} ─────────────────────────────────────
    else if (hasFO && /^BQN?/.test(t)) {
      const p = t.replace(/^BQN?/, '').split(',')
      qrMag = parseInt(p[2]) || 1; qrEcc = p[3]?.trim() || '2'; hasQR = true
    }

    // ── Field data ─────────────────────────────────────────────────────────
    else if (t.startsWith('FD') && hasFO) {
      const data = t.slice(2).replace(/\\~/g, '~').replace(/\\\^/g, '^')
      if (hasBc) {
        raw.push({ kind: 'bc', x: curX, y: curY, cmd: bcCmd, h: bcH, includeText: bcIncludeText, data })
      } else if (hasQR) {
        raw.push({ kind: 'qr', x: curX, y: curY, mag: qrMag, ecc: qrEcc, data: data.replace(/^\d+A,/, '') })
      } else if (hasFont || globalFontH > 0) {
        // ^FB is optional — many real-world ZPL labels omit it
        raw.push({ kind: 'text', x: curX, y: curY, fontH: hasFont ? fontH : globalFontH, fbW: hasFB ? fbW : 0, justify, data })
      }
    }

    else if (t.startsWith('FS')) {
      hasFO = false
    }
  }

  // ── 3. Merge consecutive fill+stroke GB pairs ────────────────────────────
  // Exporter emits fill (t=min(w,h)) then stroke (t=strokeWidth) at same position.
  const blocks: Block[] = []
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i], next = raw[i + 1]
    if (
      b.kind === 'gb' && next?.kind === 'gb' &&
      b.x === next.x && b.y === next.y &&
      b.w === next.w && b.h === next.h &&
      b.rounding === next.rounding &&
      b.t >= Math.min(b.w, b.h)
    ) {
      blocks.push({ ...next, kind: 'gb', fillColor: b.color })
      i++
    } else {
      blocks.push(b)
    }
  }

  // ── 4. Convert blocks → DrawingElements ─────────────────────────────────
  const elements: Record<string, DrawingElement> = {}
  const zOrder: string[] = []

  function push(el: DrawingElement) {
    elements[el.id] = el; zOrder.push(el.id)
  }

  for (const b of blocks) {
    const id = generateId()

    if (b.kind === 'gb') {
      const { x, y, w, h, t, color, rounding, fillColor } = b
      const isSolidSingle = !fillColor && t >= Math.min(w, h)  // single-block solid fill

      if (rounding === 8) {
        // ── Circle / ellipse
        const rxPx = toPx(w) / 2, ryPx = toPx(h) / 2
        push({
          id, type: 'circle',
          transform: { x: toPx(x) + rxPx, y: toPx(y) + ryPx, rotation: 0 },
          style: {
            ...baseStyle,
            fill: fillColor ? colorHex(fillColor) : (isSolidSingle ? colorHex(color) : 'none'),
            stroke: isSolidSingle ? 'none' : colorHex(color),
            strokeWidth: isSolidSingle ? 0 : toPx(t),
          },
          rx: rxPx, ry: ryPx, locked: false, visible: true,
        } satisfies CircleElement)

      } else if (rounding === 0 && h === t) {
        // ── Horizontal line
        push({
          id, type: 'line',
          transform: { x: 0, y: 0, rotation: 0 },
          style: { ...baseStyle, fill: 'none', stroke: colorHex(color), strokeWidth: toPx(t) },
          x1: toPx(x), y1: toPx(y) + toPx(t) / 2,
          x2: toPx(x) + toPx(w), y2: toPx(y) + toPx(t) / 2,
          locked: false, visible: true,
        } satisfies LineElement)

      } else if (rounding === 0 && w === t) {
        // ── Vertical line
        push({
          id, type: 'line',
          transform: { x: 0, y: 0, rotation: 0 },
          style: { ...baseStyle, fill: 'none', stroke: colorHex(color), strokeWidth: toPx(t) },
          x1: toPx(x) + toPx(t) / 2, y1: toPx(y),
          x2: toPx(x) + toPx(t) / 2, y2: toPx(y) + toPx(h),
          locked: false, visible: true,
        } satisfies LineElement)

      } else {
        // ── Rect
        const rxVal = rounding > 0 ? (rounding / 8) * Math.min(toPx(w), toPx(h)) : 0
        push({
          id, type: 'rect',
          transform: { x: toPx(x), y: toPx(y), rotation: 0 },
          style: {
            ...baseStyle,
            fill: fillColor ? colorHex(fillColor) : (isSolidSingle ? colorHex(color) : 'none'),
            stroke: isSolidSingle ? 'none' : colorHex(color),
            strokeWidth: isSolidSingle ? 0 : toPx(t),
          },
          width: toPx(w), height: toPx(h), rx: rxVal, ry: rxVal,
          locked: false, visible: true,
        } satisfies RectElement)
      }

    } else if (b.kind === 'text') {
      const fontSizePx = toPx(b.fontH)
      const anchorMap: Record<string, 'start'|'middle'|'end'> = { L: 'start', C: 'middle', R: 'end' }
      push({
        id, type: 'text',
        transform: { x: toPx(b.x), y: toPx(b.y), rotation: 0 },
        style: { ...baseStyle, fill: '#000000', stroke: 'none', strokeWidth: 0 },
        content: b.data,
        fontFamily: 'sans-serif', fontWeight: 'normal', fontStyle: 'normal',
        fontSize: fontSizePx,
        textAnchor: anchorMap[b.justify] ?? 'start',
        width: b.fbW > 0 ? toPx(b.fbW) : 600,   // 600 px default when no ^FB
        height: fontSizePx * 1.5,
        locked: false, visible: true,
      } satisfies TextElement)

    } else if (b.kind === 'bc') {
      const hPx = toPx(b.h)
      push({
        id, type: 'barcode',
        transform: { x: toPx(b.x), y: toPx(b.y), rotation: 0 },
        style: { ...baseStyle, fill: '#000000', stroke: 'none', strokeWidth: 0 },
        symbology: BARCODE_SYM[b.cmd] ?? 'code128',
        data: b.data,
        height: hPx, width: hPx * 2,
        includeText: b.includeText,
        cachedSvg: '', _rawWidth: 0, _rawHeight: 0,
        locked: false, visible: true,
      } satisfies BarcodeElement)

    } else if (b.kind === 'qr') {
      const sizePx = toPx(b.mag * 29)
      push({
        id, type: 'qr',
        transform: { x: toPx(b.x), y: toPx(b.y), rotation: 0 },
        style: { ...baseStyle, fill: 'none', stroke: 'none', strokeWidth: 0 },
        data: b.data,
        width: sizePx, height: sizePx,
        ecc: QR_ECC[b.ecc] ?? 'M',
        qrStyle: 'squares', fgColor: '#000000', bgColor: '#ffffff',
        cachedSvg: '',
        locked: false, visible: true,
      } satisfies QRElement)
    }
  }

  return { widthMm, heightMm, elements, zOrder }
}
