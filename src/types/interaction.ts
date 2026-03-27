import type { BBox } from './elements'

export interface ChildResizeState {
  rawBBox: BBox
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export type ToolType =
  | 'select'
  | 'circle'
  | 'rect'
  | 'line'
  | 'text'
  | 'image'
  | 'barcode'
  | 'qr'
  | 'freehand'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

export type InteractionMode =
  | { mode: 'idle' }
  | { mode: 'creating'; tool: ToolType; startX: number; startY: number; currentX: number; currentY: number }
  | { mode: 'rect_select'; startX: number; startY: number; currentX: number; currentY: number }
  | {
      mode: 'dragging'
      elementIds: string[]
      startX: number
      startY: number
      offsets: Record<string, { dx: number; dy: number }>
      hasMoved: boolean
    }
  | {
      mode: 'resizing'
      elementId: string
      handle: ResizeHandle
      originalBBox: BBox
      originalTransform: { x: number; y: number }
      startX: number
      startY: number
      originalChildStates?: Record<string, ChildResizeState>
    }
  | {
      mode: 'rotating'
      elementIds: string[]
      centerX: number
      centerY: number
      startAngle: number
      originalRotations: Record<string, number>
    }
  | { mode: 'freehand_drawing'; points: Array<{ x: number; y: number }> }
  | { mode: 'panning'; startX: number; startY: number; startPanX: number; startPanY: number }

export interface AlignmentGuide {
  orientation: 'horizontal' | 'vertical'
  position: number
  type: 'left' | 'right' | 'center-x' | 'top' | 'bottom' | 'center-y'
}

export interface Point {
  x: number
  y: number
}
