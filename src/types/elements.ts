// ─── Shared primitives ────────────────────────────────────────────────────────

export interface Transform {
  x: number
  y: number
  rotation: number // degrees
}

export interface Style {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  strokeDasharray?: string
}

export interface BBox {
  x: number
  y: number
  width: number
  height: number
  right: number
  bottom: number
  cx: number
  cy: number
}

export type ElementType =
  | 'circle'
  | 'rect'
  | 'line'
  | 'text'
  | 'image'
  | 'barcode'
  | 'qr'
  | 'freehand'
  | 'group'

export interface BaseElement {
  id: string
  type: ElementType
  transform: Transform
  style: Style
  locked: boolean
  visible: boolean
  name?: string
  parentId?: string
}

// ─── Concrete element types ───────────────────────────────────────────────────

export interface CircleElement extends BaseElement {
  type: 'circle'
  rx: number
  ry: number
  // transform.x = cx, transform.y = cy
}

export interface RectElement extends BaseElement {
  type: 'rect'
  width: number
  height: number
  rx: number
  ry: number
  // transform.x = left edge, transform.y = top edge
}

export interface LineElement extends BaseElement {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  // x1/y1/x2/y2 are absolute canvas coords; transform.x/y unused (always 0)
  markerStart?: 'none' | 'arrow'
  markerEnd?: 'none' | 'arrow'
}

export interface TextElement extends BaseElement {
  type: 'text'
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAnchor: 'start' | 'middle' | 'end'
  width: number
  height: number
  // transform.x = left, transform.y = top
}

export interface ImageElement extends BaseElement {
  type: 'image'
  href: string // base64 data URL
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

export type BarcodeSymbology =
  | 'code128'
  | 'code39'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'pdf417'
  | 'datamatrix'
  | 'azteccode'
  | 'qrcode'

export interface BarcodeElement extends BaseElement {
  type: 'barcode'
  symbology: BarcodeSymbology
  data: string
  width: number
  height: number
  includeText: boolean
  textHeight?: number  // bwip-js textheight (pts); not shown in UI
  barHeight?: number   // bwip-js height (bar height in bwip units); default 10
  cachedSvg: string // SVG string from bwip-js
  _rawWidth: number
  _rawHeight: number
}

export interface QRElement extends BaseElement {
  type: 'qr'
  data: string
  width: number
  height: number
  ecc: 'L' | 'M' | 'Q' | 'H'
  qrStyle: 'squares' | 'dots' | 'fluid'
  fgColor: string
  bgColor: string
  cachedSvg: string
}

export interface FreehandElement extends BaseElement {
  type: 'freehand'
  pathData: string
  bbox: BBox
}

export interface GroupElement extends BaseElement {
  type: 'group'
  childIds: string[]
  // bbox is derived at runtime — not stored
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type DrawingElement =
  | CircleElement
  | RectElement
  | LineElement
  | TextElement
  | ImageElement
  | BarcodeElement
  | QRElement
  | FreehandElement
  | GroupElement
