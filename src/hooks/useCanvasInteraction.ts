import { useRef, useState, useCallback } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import type { InteractionMode, ResizeHandle, Point } from '../types/interaction'
import type { DrawingElement, LineElement, GroupElement } from '../types/elements'
import type { BBox } from '../types/elements'
import { hitTest, hitTestRect, getElementBBox, getSelectionBBox, getRawBBox, rotatePoint } from '../utils/geometry'
import { computeAlignmentGuides } from './useAlignmentGuides'
import { generateId } from '../utils/idGenerator'
import type { CircleElement, RectElement, TextElement } from '../types/elements'

const HANDLE_SIZE = 8
const ROTATE_OFFSET = 24

/** Returns black or white depending on which has better contrast against the given hex color */
function contrastColor(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#000000'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // Perceived luminance (WCAG formula)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return lum > 140 ? '#000000' : '#ffffff'
}

/** Pause/resume zundo temporal tracking so entire drag = 1 undo step */
function pauseHistory() { useDrawingStore.temporal.getState().pause() }
function resumeHistory() { useDrawingStore.temporal.getState().resume() }

export function useCanvasInteraction(svgRef: React.RefObject<SVGSVGElement | null>) {
  const store = useDrawingStore()
  const [interaction, setInteraction] = useState<InteractionMode>({ mode: 'idle' })
  const spaceHeldRef = useRef(false)
  const interactionRef = useRef(interaction)
  interactionRef.current = interaction

  function getResizeHandleHit(pt: Point): ResizeHandle | null {
    const { selectedIds, elements, canvas } = store
    if (selectedIds.length !== 1) return null
    const el = elements[selectedIds[0]]
    if (!el || el.type === 'line') return null
    const raw = getRawBBox(el, elements)
    const rotation = el.transform.rotation
    const handlePx = (HANDLE_SIZE + 2) / canvas.zoom
    const handles: Array<{ handle: ResizeHandle; x: number; y: number }> = [
      { handle: 'nw', x: raw.x,     y: raw.y      },
      { handle: 'n',  x: raw.cx,    y: raw.y      },
      { handle: 'ne', x: raw.right, y: raw.y      },
      { handle: 'w',  x: raw.x,     y: raw.cy     },
      { handle: 'e',  x: raw.right, y: raw.cy     },
      { handle: 'sw', x: raw.x,     y: raw.bottom },
      { handle: 's',  x: raw.cx,    y: raw.bottom },
      { handle: 'se', x: raw.right, y: raw.bottom },
    ]
    for (const h of handles) {
      const { x: hx, y: hy } = rotatePoint(h.x, h.y, raw.cx, raw.cy, rotation)
      if (Math.abs(pt.x - hx) <= handlePx && Math.abs(pt.y - hy) <= handlePx) {
        return h.handle
      }
    }
    return null
  }

  function isOnRotateHandle(pt: Point): boolean {
    const { selectedIds, elements, canvas } = store
    if (selectedIds.length !== 1) return false
    const el = elements[selectedIds[0]]
    if (!el || el.type === 'line') return false
    const raw = getRawBBox(el, elements)
    const rotation = el.transform.rotation
    const offset = ROTATE_OFFSET / canvas.zoom
    const { x: hx, y: hy } = rotatePoint(raw.cx, raw.y - offset, raw.cx, raw.cy, rotation)
    const r = (HANDLE_SIZE + 4) / canvas.zoom
    return Math.hypot(pt.x - hx, pt.y - hy) <= r
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      e.preventDefault()

      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const { zoom, panX, panY } = store.canvas
      const pt: Point = {
        x: (e.clientX - rect.left - panX) / zoom,
        y: (e.clientY - rect.top - panY) / zoom,
      }

      if (spaceHeldRef.current) {
        setInteraction({ mode: 'panning', startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY })
        return
      }

      const { activeTool, selectedIds, elements, zOrder } = store

      if (activeTool === 'freehand') {
        setInteraction({ mode: 'freehand_drawing', points: [pt] })
        return
      }

      if (activeTool !== 'select') {
        setInteraction({ mode: 'creating', tool: activeTool, startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y })
        return
      }

      // Check rotate handle
      if (selectedIds.length > 0 && isOnRotateHandle(pt)) {
        const bbox = getSelectionBBox(selectedIds, elements)
        const startAngle = Math.atan2(pt.y - bbox.cy, pt.x - bbox.cx)
        pauseHistory()
        setInteraction({
          mode: 'rotating',
          elementIds: [...selectedIds],
          centerX: bbox.cx,
          centerY: bbox.cy,
          startAngle,
          originalRotations: Object.fromEntries(
            selectedIds.map((id) => [id, elements[id]?.transform.rotation ?? 0])
          ),
        })
        return
      }

      // Check resize handles
      const resizeHandle = getResizeHandleHit(pt)
      if (resizeHandle && selectedIds.length === 1) {
        const el = elements[selectedIds[0]]
        const rawBBox = getRawBBox(el, elements)
        let originalChildStates: Record<string, { rawBBox: BBox; x1?: number; y1?: number; x2?: number; y2?: number }> | undefined
        if (el.type === 'group') {
          const group = el as GroupElement
          originalChildStates = {}
          group.childIds.forEach((childId) => {
            const child = elements[childId]
            if (!child) return
            const cs: { rawBBox: BBox; x1?: number; y1?: number; x2?: number; y2?: number } = {
              rawBBox: getRawBBox(child, elements),
            }
            if (child.type === 'line') {
              const ln = child as LineElement
              cs.x1 = ln.x1; cs.y1 = ln.y1; cs.x2 = ln.x2; cs.y2 = ln.y2
            }
            originalChildStates![childId] = cs
          })
        }
        pauseHistory()
        setInteraction({
          mode: 'resizing',
          elementId: selectedIds[0],
          handle: resizeHandle,
          originalBBox: rawBBox,
          originalTransform: { x: el.transform.x, y: el.transform.y },
          startX: pt.x,
          startY: pt.y,
          ...(originalChildStates ? { originalChildStates } : {}),
        })
        return
      }

      // Hit test
      const hit = hitTest(pt.x, pt.y, zOrder, elements)
      if (hit) {
        const el = elements[hit]
        const selectId = el.parentId ?? hit
        const newSelected = e.shiftKey
          ? store.selectedIds.includes(selectId)
            ? store.selectedIds.filter((id) => id !== selectId)
            : [...store.selectedIds, selectId]
          : [selectId]
        store.setSelectedIds(newSelected)
        pauseHistory()
        setInteraction({
          mode: 'dragging',
          elementIds: newSelected,
          startX: pt.x,
          startY: pt.y,
          offsets: Object.fromEntries(
            newSelected.map((id) => {
              const el2 = elements[id]
              return [id, { dx: el2.transform.x - pt.x, dy: el2.transform.y - pt.y }]
            })
          ),
          hasMoved: false,
        })
      } else {
        if (!e.shiftKey) store.clearSelection()
        setInteraction({ mode: 'rect_select', startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const { zoom, panX, panY } = store.canvas
      const pt: Point = {
        x: (e.clientX - rect.left - panX) / zoom,
        y: (e.clientY - rect.top - panY) / zoom,
      }
      const iState = interactionRef.current

      switch (iState.mode) {
        case 'creating': {
          setInteraction({ ...iState, currentX: pt.x, currentY: pt.y })
          updateGhostElement(iState.tool, iState.startX, iState.startY, pt.x, pt.y)
          break
        }
        case 'rect_select': {
          setInteraction({ ...iState, currentX: pt.x, currentY: pt.y })
          break
        }
        case 'dragging': {
          const rawDx = pt.x - iState.startX
          const rawDy = pt.y - iState.startY
          const { snappedDelta, guides } = store.canvas.snapToElements
            ? computeAlignmentGuides(iState.elementIds, { dx: rawDx, dy: rawDy }, store.elements, store.canvas.snapThreshold)
            : { snappedDelta: { dx: rawDx, dy: rawDy }, guides: [] }

          store.setAlignmentGuides(guides)

          iState.elementIds.forEach((id) => {
            const offset = iState.offsets[id]
            const el = store.elements[id]
            if (!el) return
            const newX = pt.x + offset.dx + (snappedDelta.dx - rawDx)
            const newY = pt.y + offset.dy + (snappedDelta.dy - rawDy)
            applyTranslate(id, newX, newY, el)
          })

          if (!iState.hasMoved) setInteraction({ ...iState, hasMoved: true })
          break
        }
        case 'resizing': {
          applyResize(iState, pt, e.shiftKey)
          break
        }
        case 'rotating': {
          const angle = Math.atan2(pt.y - iState.centerY, pt.x - iState.centerX)
          const deltaDeg = ((angle - iState.startAngle) * 180) / Math.PI
          iState.elementIds.forEach((id) => {
            let newRot = iState.originalRotations[id] + deltaDeg
            if (e.shiftKey) newRot = Math.round(newRot / 15) * 15
            newRot = ((newRot % 360) + 360) % 360
            const el = store.elements[id]
            if (el) store.updateElement(id, { transform: { ...el.transform, rotation: newRot } })
          })
          break
        }
        case 'freehand_drawing': {
          setInteraction({ ...iState, points: [...iState.points, pt] })
          break
        }
        case 'panning': {
          const dx = e.clientX - iState.startX
          const dy = e.clientY - iState.startY
          store.updateCanvas({ panX: iState.startPanX + dx, panY: iState.startPanY + dy })
          break
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const { zoom, panX, panY } = store.canvas
      const pt: Point = {
        x: (e.clientX - rect.left - panX) / zoom,
        y: (e.clientY - rect.top - panY) / zoom,
      }
      const iState = interactionRef.current

      switch (iState.mode) {
        case 'creating': {
          finalizeElement(iState.tool, iState.startX, iState.startY, pt.x, pt.y)
          store.setGhostElement(null)
          break
        }
        case 'rect_select': {
          const hits = hitTestRect(
            iState.startX, iState.startY,
            iState.currentX - iState.startX,
            iState.currentY - iState.startY,
            store.elements, store.zOrder
          )
          store.setSelectedIds(hits)
          break
        }
        case 'dragging': {
          store.setAlignmentGuides([])
          resumeHistory()
          break
        }
        case 'resizing': {
          resumeHistory()
          break
        }
        case 'rotating': {
          resumeHistory()
          break
        }
        case 'freehand_drawing': {
          if (iState.points.length > 1) finalizeFreehand(iState.points)
          break
        }
      }

      setInteraction({ mode: 'idle' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store]
  )

  function applyTranslate(id: string, newX: number, newY: number, el: DrawingElement) {
    if (el.type === 'group') {
      const group = el as GroupElement
      const dx = newX - el.transform.x
      const dy = newY - el.transform.y
      store.updateElement(id, { transform: { ...el.transform, x: newX, y: newY } })
      group.childIds.forEach((cid) => {
        const child = store.elements[cid]
        if (!child) return
        if (child.type === 'line') {
          const line = child as LineElement
          store.updateElement(cid, {
            x1: line.x1 + dx, y1: line.y1 + dy,
            x2: line.x2 + dx, y2: line.y2 + dy,
            transform: { ...child.transform, x: child.transform.x + dx, y: child.transform.y + dy },
          } as Partial<DrawingElement>)
        } else {
          store.updateElement(cid, { transform: { ...child.transform, x: child.transform.x + dx, y: child.transform.y + dy } })
        }
      })
    } else if (el.type === 'line') {
      const line = el as LineElement
      const dx = newX - line.transform.x
      const dy = newY - line.transform.y
      store.updateElement(id, {
        x1: line.x1 + dx, y1: line.y1 + dy,
        x2: line.x2 + dx, y2: line.y2 + dy,
        transform: { ...line.transform, x: newX, y: newY },
      } as Partial<DrawingElement>)
    } else {
      store.updateElement(id, { transform: { ...el.transform, x: newX, y: newY } })
    }
  }

  function applyResize(
    state: Extract<InteractionMode, { mode: 'resizing' }>,
    pt: Point,
    shiftKey: boolean
  ) {
    const { elementId, handle, originalBBox, startX, startY } = state
    const el = store.elements[elementId]
    if (!el) return

    const rot = el.transform.rotation
    const rad = (-rot * Math.PI) / 180
    const rawDx = pt.x - startX
    const rawDy = pt.y - startY
    const dx = rawDx * Math.cos(rad) - rawDy * Math.sin(rad)
    const dy = rawDx * Math.sin(rad) + rawDy * Math.cos(rad)

    let newX = originalBBox.x
    let newY = originalBBox.y
    let newW = originalBBox.width
    let newH = originalBBox.height

    if (handle.includes('e')) newW = Math.max(4, originalBBox.width + dx)
    if (handle.includes('s')) newH = Math.max(4, originalBBox.height + dy)
    if (handle.includes('w')) {
      newW = Math.max(4, originalBBox.width - dx)
      newX = originalBBox.x + (originalBBox.width - newW)
    }
    if (handle.includes('n')) {
      newH = Math.max(4, originalBBox.height - dy)
      newY = originalBBox.y + (originalBBox.height - newH)
    }

    if (shiftKey) {
      const aspect = originalBBox.width / (originalBBox.height || 1)
      if (Math.abs(dx) > Math.abs(dy)) newH = newW / aspect
      else newW = newH * aspect
    }

    switch (el.type) {
      case 'circle':
        store.updateElement(elementId, {
          transform: { ...el.transform, x: newX + newW / 2, y: newY + newH / 2 },
          rx: newW / 2, ry: newH / 2,
        } as Partial<DrawingElement>)
        break
      case 'text': {
        store.updateElement(elementId, {
          transform: { ...el.transform, x: newX, y: newY },
          width: newW, height: newH,
          fontSize: Math.max(Math.round(newH * 0.80), 8),
        } as Partial<DrawingElement>)
        break
      }
      case 'rect':
      case 'image':
      case 'barcode':
      case 'qr':
        store.updateElement(elementId, {
          transform: { ...el.transform, x: newX, y: newY },
          width: newW, height: newH,
        } as Partial<DrawingElement>)
        break
      case 'freehand':
        store.updateElement(elementId, {
          bbox: { x: newX, y: newY, width: newW, height: newH, right: newX + newW, bottom: newY + newH, cx: newX + newW / 2, cy: newY + newH / 2 }
        } as Partial<DrawingElement>)
        break
      case 'group': {
        const { originalChildStates } = state
        if (!originalChildStates) break
        const scaleX = newW / state.originalBBox.width
        const scaleY = newH / state.originalBBox.height
        const group = el as GroupElement
        group.childIds.forEach((childId) => {
          const cs = originalChildStates[childId]
          const child = store.elements[childId]
          if (!cs || !child) return
          const newChildRawX = newX + (cs.rawBBox.x - state.originalBBox.x) * scaleX
          const newChildRawY = newY + (cs.rawBBox.y - state.originalBBox.y) * scaleY
          const newChildW = Math.max(4, cs.rawBBox.width * scaleX)
          const newChildH = Math.max(4, cs.rawBBox.height * scaleY)
          if (child.type === 'line' && cs.x1 !== undefined) {
            const bw = cs.rawBBox.width || 1
            const bh = cs.rawBBox.height || 1
            const nx1 = newChildRawX + ((cs.x1 - cs.rawBBox.x) / bw) * newChildW
            const ny1 = newChildRawY + ((cs.y1! - cs.rawBBox.y) / bh) * newChildH
            const nx2 = newChildRawX + ((cs.x2! - cs.rawBBox.x) / bw) * newChildW
            const ny2 = newChildRawY + ((cs.y2! - cs.rawBBox.y) / bh) * newChildH
            store.updateElement(childId, {
              x1: nx1, y1: ny1, x2: nx2, y2: ny2,
              transform: { ...child.transform, x: nx1, y: ny1 },
            } as Partial<DrawingElement>)
          } else if (child.type === 'circle') {
            store.updateElement(childId, {
              transform: { ...child.transform, x: newChildRawX + newChildW / 2, y: newChildRawY + newChildH / 2 },
              rx: newChildW / 2, ry: newChildH / 2,
            } as Partial<DrawingElement>)
          } else if (child.type === 'text') {
            store.updateElement(childId, {
              transform: { ...child.transform, x: newChildRawX, y: newChildRawY },
              width: newChildW, height: newChildH,
              fontSize: Math.max(Math.round(newChildH * 0.80), 8),
            } as Partial<DrawingElement>)
          } else {
            store.updateElement(childId, {
              transform: { ...child.transform, x: newChildRawX, y: newChildRawY },
              width: newChildW, height: newChildH,
            } as Partial<DrawingElement>)
          }
        })
        // Update group's transform to track new bbox origin
        store.updateElement(elementId, {
          transform: { ...el.transform, x: newX, y: newY },
        })
        break
      }
    }
  }

  function updateGhostElement(tool: string, x1: number, y1: number, x2: number, y2: number) {
    const { defaultStyle } = store
    const minX = Math.min(x1, x2)
    const minY = Math.min(y1, y2)
    const w = Math.abs(x2 - x1)
    const h = Math.abs(y2 - y1)

    let ghost: Partial<DrawingElement> | null = null
    switch (tool) {
      case 'circle':
        ghost = { type: 'circle', transform: { x: minX + w / 2, y: minY + h / 2, rotation: 0 }, rx: w / 2, ry: h / 2, style: { ...defaultStyle } } as Partial<CircleElement>
        break
      case 'rect':
        ghost = { type: 'rect', transform: { x: minX, y: minY, rotation: 0 }, width: w, height: h, rx: 0, ry: 0, style: { ...defaultStyle } } as Partial<RectElement>
        break
      case 'line':
        ghost = { type: 'line', x1, y1, x2, y2, transform: { x: 0, y: 0, rotation: 0 }, style: { ...defaultStyle } } as Partial<LineElement>
        break
      case 'text':
        ghost = { type: 'text', transform: { x: minX, y: minY, rotation: 0 }, width: Math.max(w, 80), height: Math.max(h, 30), style: { ...defaultStyle } } as Partial<TextElement>
        break
    }
    store.setGhostElement(ghost)
  }

  function finalizeElement(tool: string, x1: number, y1: number, x2: number, y2: number) {
    const { defaultStyle } = store
    const minX = Math.min(x1, x2)
    const minY = Math.min(y1, y2)
    const w = Math.abs(x2 - x1)
    const h = Math.abs(y2 - y1)

    if (tool !== 'line' && tool !== 'text' && (w < 4 || h < 4)) return

    const id = generateId()
    const base = { id, locked: false, visible: true, transform: { x: 0, y: 0, rotation: 0 }, style: { ...defaultStyle } }

    let el: DrawingElement | null = null
    switch (tool) {
      case 'circle':
        el = { ...base, type: 'circle', transform: { x: minX + w / 2, y: minY + h / 2, rotation: 0 }, rx: Math.max(w / 2, 4), ry: Math.max(h / 2, 4) } as DrawingElement
        break
      case 'rect':
        el = { ...base, type: 'rect', transform: { x: minX, y: minY, rotation: 0 }, width: Math.max(w, 4), height: Math.max(h, 4), rx: 0, ry: 0 } as DrawingElement
        break
      case 'line':
        el = { ...base, type: 'line', x1, y1, x2, y2, transform: { x: x1, y: y1, rotation: 0 } } as DrawingElement
        break
      case 'text': {
        const bgColor = store.canvas.backgroundColor ?? '#ffffff'
        const textFill = contrastColor(bgColor)
        el = {
          ...base, type: 'text',
          transform: { x: minX, y: minY, rotation: 0 },
          content: 'Text', fontFamily: 'sans-serif', fontSize: Math.max(Math.round(h * 0.80), 8),
          fontWeight: 'normal', fontStyle: 'normal', textAnchor: 'start',
          width: Math.max(w, 100), height: Math.max(h, 30),
          style: { ...defaultStyle, fill: textFill, stroke: 'none' },
        } as DrawingElement
        break
      }
    }
    if (el) {
      store.addElement(el)
      store.setActiveTool('select')
    }
  }

  function finalizeFreehand(points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return
    const d = 'M ' + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY, right: maxX, bottom: maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
    const id = generateId()
    store.addElement({
      id, type: 'freehand', pathData: d, bbox,
      transform: { x: 0, y: 0, rotation: 0 },
      style: { ...store.defaultStyle, fill: 'none' },
      locked: false, visible: true,
    })
    store.setActiveTool('select')
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') spaceHeldRef.current = true
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') spaceHeldRef.current = false
  }, [])

  return { interaction, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp }
}
