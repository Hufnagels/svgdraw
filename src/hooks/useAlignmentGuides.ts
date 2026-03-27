import type { DrawingElement } from '../types/elements'
import type { AlignmentGuide } from '../types/interaction'
import { getElementBBox } from '../utils/geometry'

interface AlignPos {
  id: string
  left: number
  right: number
  centerX: number
  top: number
  bottom: number
  centerY: number
}

function toBBoxPos(id: string, el: DrawingElement, elements: Record<string, DrawingElement>): AlignPos {
  const b = getElementBBox(el, elements)
  return { id, left: b.x, right: b.right, centerX: b.cx, top: b.y, bottom: b.bottom, centerY: b.cy }
}

const xPairs: Array<[keyof AlignPos, keyof AlignPos, AlignmentGuide['type']]> = [
  ['left',    'left',    'left'],
  ['left',    'right',   'left'],
  ['right',   'right',   'right'],
  ['right',   'left',    'right'],
  ['centerX', 'centerX', 'center-x'],
]
const yPairs: Array<[keyof AlignPos, keyof AlignPos, AlignmentGuide['type']]> = [
  ['top',     'top',     'top'],
  ['top',     'bottom',  'top'],
  ['bottom',  'bottom',  'bottom'],
  ['bottom',  'top',     'bottom'],
  ['centerY', 'centerY', 'center-y'],
]

export function computeAlignmentGuides(
  draggingIds: string[],
  proposedDelta: { dx: number; dy: number },
  elements: Record<string, DrawingElement>,
  threshold: number
): { snappedDelta: { dx: number; dy: number }; guides: AlignmentGuide[] } {
  // Candidates: all non-dragging visible root elements
  const candidates: AlignPos[] = Object.values(elements)
    .filter((el) => !draggingIds.includes(el.id) && !el.locked && !el.parentId && el.visible)
    .map((el) => toBBoxPos(el.id, el, elements))

  if (candidates.length === 0) {
    return { snappedDelta: proposedDelta, guides: [] }
  }

  // Proposed positions of dragging elements
  const draggingBoxes = draggingIds
    .map((id) => elements[id])
    .filter(Boolean)
    .map((el) => {
      const pos = toBBoxPos(el.id, el, elements)
      return {
        id: el.id,
        left:    pos.left    + proposedDelta.dx,
        right:   pos.right   + proposedDelta.dx,
        centerX: pos.centerX + proposedDelta.dx,
        top:     pos.top     + proposedDelta.dy,
        bottom:  pos.bottom  + proposedDelta.dy,
        centerY: pos.centerY + proposedDelta.dy,
      }
    })

  // Find best snap per axis
  let bestSnapDx: number | null = null
  let bestSnapDy: number | null = null
  let minDistX = threshold + 1
  let minDistY = threshold + 1

  for (const dBox of draggingBoxes) {
    for (const cBox of candidates) {
      for (const [dp, cp] of xPairs) {
        const dist = Math.abs((dBox[dp] as number) - (cBox[cp] as number))
        if (dist <= threshold && dist < minDistX) {
          minDistX = dist
          bestSnapDx = proposedDelta.dx + ((cBox[cp] as number) - (dBox[dp] as number))
        }
      }
      for (const [dp, cp] of yPairs) {
        const dist = Math.abs((dBox[dp] as number) - (cBox[cp] as number))
        if (dist <= threshold && dist < minDistY) {
          minDistY = dist
          bestSnapDy = proposedDelta.dy + ((cBox[cp] as number) - (dBox[dp] as number))
        }
      }
    }
  }

  const snappedDelta = {
    dx: bestSnapDx !== null ? bestSnapDx : proposedDelta.dx,
    dy: bestSnapDy !== null ? bestSnapDy : proposedDelta.dy,
  }

  // Collect guide lines using snapped positions
  const guides: AlignmentGuide[] = []
  const snapTol = 1.0 // tolerance after snapping (floating point safety)

  if (bestSnapDx !== null || bestSnapDy !== null) {
    const snappedBoxes = draggingIds
      .map((id) => elements[id])
      .filter(Boolean)
      .map((el) => {
        const pos = toBBoxPos(el.id, el, elements)
        return {
          left:    pos.left    + snappedDelta.dx,
          right:   pos.right   + snappedDelta.dx,
          centerX: pos.centerX + snappedDelta.dx,
          top:     pos.top     + snappedDelta.dy,
          bottom:  pos.bottom  + snappedDelta.dy,
          centerY: pos.centerY + snappedDelta.dy,
        }
      })

    for (const sBox of snappedBoxes) {
      for (const cBox of candidates) {
        // Vertical guide lines (x alignment)
        for (const [dp, cp, type] of xPairs) {
          const val = sBox[dp as keyof typeof sBox] as number
          const cVal = cBox[cp as keyof typeof cBox] as number
          if (Math.abs(val - cVal) <= snapTol) {
            const pos = (val + cVal) / 2 // use average for perfect alignment
            if (!guides.find((g) => g.orientation === 'vertical' && Math.abs(g.position - pos) <= snapTol)) {
              guides.push({ orientation: 'vertical', position: pos, type })
            }
          }
        }
        // Horizontal guide lines (y alignment)
        for (const [dp, cp, type] of yPairs) {
          const val = sBox[dp as keyof typeof sBox] as number
          const cVal = cBox[cp as keyof typeof cBox] as number
          if (Math.abs(val - cVal) <= snapTol) {
            const pos = (val + cVal) / 2
            if (!guides.find((g) => g.orientation === 'horizontal' && Math.abs(g.position - pos) <= snapTol)) {
              guides.push({ orientation: 'horizontal', position: pos, type })
            }
          }
        }
      }
    }
  }

  return { snappedDelta, guides }
}
