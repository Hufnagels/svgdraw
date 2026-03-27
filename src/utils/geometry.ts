import type {
  DrawingElement,
  CircleElement,
  RectElement,
  LineElement,
  TextElement,
  ImageElement,
  BarcodeElement,
  QRElement,
  FreehandElement,
  GroupElement,
  BBox,
} from '../types/elements'

export function makeBBox(x: number, y: number, width: number, height: number): BBox {
  return {
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    cx: x + width / 2,
    cy: y + height / 2,
  }
}

export function rotatePoint(px: number, py: number, cx: number, cy: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - cx
  const dy = py - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

function rotatedBBox(raw: BBox, angleDeg: number): BBox {
  if (angleDeg === 0) return raw
  const { cx, cy } = raw
  const corners = [
    { x: raw.x, y: raw.y },
    { x: raw.right, y: raw.y },
    { x: raw.right, y: raw.bottom },
    { x: raw.x, y: raw.bottom },
  ].map((p) => rotatePoint(p.x, p.y, cx, cy, angleDeg))
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return makeBBox(minX, minY, maxX - minX, maxY - minY)
}

export function getElementBBox(
  el: DrawingElement,
  elements: Record<string, DrawingElement>
): BBox {
  const raw = getRawBBox(el, elements)
  return rotatedBBox(raw, el.transform.rotation)
}

export function getRawBBox(el: DrawingElement, elements: Record<string, DrawingElement>): BBox {
  switch (el.type) {
    case 'circle':
      return makeBBox(
        el.transform.x - (el as CircleElement).rx,
        el.transform.y - (el as CircleElement).ry,
        (el as CircleElement).rx * 2,
        (el as CircleElement).ry * 2
      )
    case 'rect': {
      const r = el as RectElement
      return makeBBox(r.transform.x, r.transform.y, r.width, r.height)
    }
    case 'line': {
      const l = el as LineElement
      const minX = Math.min(l.x1, l.x2)
      const maxX = Math.max(l.x1, l.x2)
      const minY = Math.min(l.y1, l.y2)
      const maxY = Math.max(l.y1, l.y2)
      return makeBBox(minX, minY, Math.max(maxX - minX, 1), Math.max(maxY - minY, 1))
    }
    case 'text': {
      const t = el as TextElement
      return makeBBox(t.transform.x, t.transform.y, t.width, t.height)
    }
    case 'image': {
      const img = el as ImageElement
      return makeBBox(img.transform.x, img.transform.y, img.width, img.height)
    }
    case 'barcode': {
      const b = el as BarcodeElement
      return makeBBox(b.transform.x, b.transform.y, b.width, b.height)
    }
    case 'qr': {
      const q = el as QRElement
      return makeBBox(q.transform.x, q.transform.y, q.width, q.height)
    }
    case 'freehand': {
      const f = el as FreehandElement
      return f.bbox
    }
    case 'group':
      return getGroupBBox(el as GroupElement, elements)
    default:
      return makeBBox(0, 0, 1, 1)
  }
}

export function getGroupBBox(
  group: GroupElement,
  elements: Record<string, DrawingElement>
): BBox {
  const childBBoxes = group.childIds
    .map((id) => elements[id])
    .filter(Boolean)
    .map((child) => getElementBBox(child, elements))
  return mergeBBoxes(childBBoxes)
}

export function mergeBBoxes(boxes: BBox[]): BBox {
  if (boxes.length === 0) return makeBBox(0, 0, 0, 0)
  const minX = Math.min(...boxes.map((b) => b.x))
  const minY = Math.min(...boxes.map((b) => b.y))
  const maxX = Math.max(...boxes.map((b) => b.right))
  const maxY = Math.max(...boxes.map((b) => b.bottom))
  return makeBBox(minX, minY, maxX - minX, maxY - minY)
}

export function getSelectionBBox(
  selectedIds: string[],
  elements: Record<string, DrawingElement>
): BBox {
  const boxes = selectedIds
    .map((id) => elements[id])
    .filter(Boolean)
    .map((el) => getElementBBox(el, elements))
  return mergeBBoxes(boxes)
}

/** Returns element id of topmost element hit at point, or null */
export function hitTest(
  x: number,
  y: number,
  zOrder: string[],
  elements: Record<string, DrawingElement>
): string | null {
  // Iterate in reverse z-order (topmost first)
  for (let i = zOrder.length - 1; i >= 0; i--) {
    const id = zOrder[i]
    const el = elements[id]
    if (!el || !el.visible || el.locked) continue
    const bbox = getElementBBox(el, elements)
    if (x >= bbox.x && x <= bbox.right && y >= bbox.y && y <= bbox.bottom) {
      return id
    }
  }
  return null
}

/** Get all elements within rubber-band rect */
export function hitTestRect(
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  elements: Record<string, DrawingElement>,
  zOrder: string[]
): string[] {
  const normX = Math.min(rx, rx + rw)
  const normY = Math.min(ry, ry + rh)
  const normW = Math.abs(rw)
  const normH = Math.abs(rh)
  return zOrder.filter((id) => {
    const el = elements[id]
    if (!el || !el.visible || el.locked || el.parentId) return false
    const bbox = getElementBBox(el, elements)
    return (
      bbox.x >= normX &&
      bbox.right <= normX + normW &&
      bbox.y >= normY &&
      bbox.bottom <= normY + normH
    )
  })
}

/** Compute SVG transform string for an element */
export function elementTransform(el: DrawingElement, cx: number, cy: number): string {
  if (el.transform.rotation === 0) return ''
  return `rotate(${el.transform.rotation} ${cx} ${cy})`
}
