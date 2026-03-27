import { create } from 'zustand'
import { temporal } from 'zundo'
import type { DrawingElement, Style } from '../types/elements'
import type { ToolType, AlignmentGuide } from '../types/interaction'
import { generateId } from '../utils/idGenerator'
import { getElementBBox, mergeBBoxes } from '../utils/geometry'
import type { GroupElement } from '../types/elements'
import { mmToPx, type DPI } from '../utils/units'

export interface CanvasSettings {
  // Physical dimensions (source of truth)
  widthMm: number
  heightMm: number
  dpi: DPI
  // Derived pixel dimensions — always mmToPx(widthMm/heightMm, dpi)
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
  showGrid: boolean
  snapToElements: boolean
  snapThreshold: number
  backgroundColor: string
  borderRadius: number
}

interface TransientState {
  ghostElement: Partial<DrawingElement> | null
  alignmentGuides: AlignmentGuide[]
  editingTextId: string | null
}

interface DrawingState extends TransientState {
  // Element registry
  elements: Record<string, DrawingElement>
  zOrder: string[] // root-level IDs

  // Selection
  selectedIds: string[]
  hoveredId: string | null

  // Tool + style defaults
  activeTool: ToolType
  defaultStyle: Style

  // Canvas settings
  canvas: CanvasSettings

  // Actions
  setActiveTool: (tool: ToolType) => void
  setDefaultStyle: (patch: Partial<Style>) => void

  addElement: (el: DrawingElement) => void
  updateElement: (id: string, patch: Partial<DrawingElement>) => void
  removeElements: (ids: string[]) => void
  duplicateElements: (ids: string[]) => string[]

  setSelectedIds: (ids: string[]) => void
  addToSelection: (id: string) => void
  clearSelection: () => void
  setHoveredId: (id: string | null) => void

  bringForward: (ids: string[]) => void
  sendBackward: (ids: string[]) => void
  bringToFront: (ids: string[]) => void
  sendToBack: (ids: string[]) => void

  groupElements: (ids: string[]) => string
  ungroupElements: (groupId: string) => void

  updateCanvas: (patch: Partial<CanvasSettings>) => void

  setGhostElement: (ghost: Partial<DrawingElement> | null) => void
  setAlignmentGuides: (guides: AlignmentGuide[]) => void
  setEditingTextId: (id: string | null) => void

  loadDocument: (elements: Record<string, DrawingElement>, zOrder: string[], canvasPatch: Partial<CanvasSettings>) => void
}

export const useDrawingStore = create<DrawingState>()(
  temporal(
    (set, get) => ({
      elements: {},
      zOrder: [],
      selectedIds: [],
      hoveredId: null,
      activeTool: 'select' as ToolType,
      defaultStyle: {
        fill: '#ffffff',
        stroke: '#1e293b',
        strokeWidth: 2,
        opacity: 1,
      },
      canvas: {
        widthMm: 100, heightMm: 50, dpi: 203 as DPI,
        width: mmToPx(100, 203), height: mmToPx(50, 203),
        zoom: 1, panX: 0, panY: 0,
        showGrid: true, snapToElements: true, snapThreshold: 6,
        backgroundColor: '#ffffff', borderRadius: 0,
      },
      ghostElement: null,
      alignmentGuides: [],
      editingTextId: null,

      setActiveTool: (tool) => set({ activeTool: tool }),

      setDefaultStyle: (patch) =>
        set((s) => ({ defaultStyle: { ...s.defaultStyle, ...patch } })),

      addElement: (el) =>
        set((s) => ({
          elements: { ...s.elements, [el.id]: el },
          zOrder: [...s.zOrder, el.id],
          selectedIds: [el.id],
        })),

      updateElement: (id, patch) =>
        set((s) => ({
          elements: {
            ...s.elements,
            [id]: { ...s.elements[id], ...patch } as DrawingElement,
          },
        })),

      removeElements: (ids) =>
        set((s) => {
          const next = { ...s.elements }
          // Also remove children of groups
          const toRemove = new Set(ids)
          ids.forEach((id) => {
            const el = s.elements[id]
            if (el?.type === 'group') {
              ;(el as GroupElement).childIds.forEach((cid) => toRemove.add(cid))
            }
          })
          toRemove.forEach((id) => delete next[id])
          return {
            elements: next,
            zOrder: s.zOrder.filter((id) => !toRemove.has(id)),
            selectedIds: s.selectedIds.filter((id) => !toRemove.has(id)),
          }
        }),

      duplicateElements: (ids) => {
        const s = get()
        const idMap: Record<string, string> = {}

        // Collect all IDs to duplicate: top-level + group children
        const allIds: string[] = []
        ids.forEach((id) => {
          idMap[id] = generateId()
          allIds.push(id)
          const el = s.elements[id]
          if (el?.type === 'group') {
            ;(el as GroupElement).childIds.forEach((childId) => {
              if (!idMap[childId]) {
                idMap[childId] = generateId()
                allIds.push(childId)
              }
            })
          }
        })

        const newEls: DrawingElement[] = allIds.map((id) => {
          const el = s.elements[id]
          if (el.type === 'group') {
            const group = el as GroupElement
            return {
              ...group,
              id: idMap[id],
              childIds: group.childIds.map((cid) => idMap[cid] ?? cid),
              transform: { ...group.transform, x: group.transform.x + 20, y: group.transform.y + 20 },
              parentId: undefined,
            } as DrawingElement
          }
          if (el.type === 'line') {
            const ln = el as import('../types/elements').LineElement
            return {
              ...ln,
              id: idMap[id],
              x1: ln.x1 + 20, y1: ln.y1 + 20,
              x2: ln.x2 + 20, y2: ln.y2 + 20,
              transform: { ...ln.transform, x: ln.transform.x + 20, y: ln.transform.y + 20 },
              parentId: el.parentId ? idMap[el.parentId] : undefined,
            } as DrawingElement
          }
          return {
            ...el,
            id: idMap[id],
            transform: { ...el.transform, x: el.transform.x + 20, y: el.transform.y + 20 },
            parentId: el.parentId ? idMap[el.parentId] : undefined,
          } as DrawingElement
        })

        // Only top-level duplicated IDs go into zOrder and selectedIds
        const newRootIds = ids.map((id) => idMap[id])
        set((state) => {
          const newElements = { ...state.elements }
          newEls.forEach((e) => { newElements[e.id] = e })
          return {
            elements: newElements,
            zOrder: [...state.zOrder, ...newRootIds],
            selectedIds: newRootIds,
          }
        })
        return newRootIds
      },

      setSelectedIds: (ids) => set({ selectedIds: ids }),
      addToSelection: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds
            : [...s.selectedIds, id],
        })),
      clearSelection: () => set({ selectedIds: [] }),
      setHoveredId: (id) => set({ hoveredId: id }),

      bringForward: (ids) =>
        set((s) => {
          const order = [...s.zOrder]
          // Process from highest index to avoid collisions
          const sortedIds = [...ids].sort((a, b) => order.indexOf(b) - order.indexOf(a))
          sortedIds.forEach((id) => {
            const i = order.indexOf(id)
            if (i < order.length - 1 && !ids.includes(order[i + 1])) {
              ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
            }
          })
          return { zOrder: order }
        }),

      sendBackward: (ids) =>
        set((s) => {
          const order = [...s.zOrder]
          const sortedIds = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b))
          sortedIds.forEach((id) => {
            const i = order.indexOf(id)
            if (i > 0 && !ids.includes(order[i - 1])) {
              ;[order[i], order[i - 1]] = [order[i - 1], order[i]]
            }
          })
          return { zOrder: order }
        }),

      bringToFront: (ids) =>
        set((s) => ({
          zOrder: [...s.zOrder.filter((id) => !ids.includes(id)), ...ids],
        })),

      sendToBack: (ids) =>
        set((s) => ({
          zOrder: [...ids, ...s.zOrder.filter((id) => !ids.includes(id))],
        })),

      groupElements: (ids) => {
        const s = get()
        const groupId = generateId()
        const childBBoxes = ids
          .map((id) => s.elements[id])
          .filter(Boolean)
          .map((el) => getElementBBox(el, s.elements))
        const bbox = mergeBBoxes(childBBoxes)

        const group: GroupElement = {
          id: groupId,
          type: 'group',
          childIds: ids,
          transform: { x: bbox.x, y: bbox.y, rotation: 0 },
          style: { fill: 'none', stroke: 'none', strokeWidth: 0, opacity: 1 },
          locked: false,
          visible: true,
        }

        const firstIdx = Math.min(...ids.map((id) => s.zOrder.indexOf(id)).filter((i) => i >= 0))
        const newZOrder = s.zOrder.filter((id) => !ids.includes(id))
        newZOrder.splice(firstIdx, 0, groupId)

        const updatedElements = { ...s.elements }
        ids.forEach((id) => {
          updatedElements[id] = { ...updatedElements[id], parentId: groupId }
        })
        updatedElements[groupId] = group

        set({ elements: updatedElements, zOrder: newZOrder, selectedIds: [groupId] })
        return groupId
      },

      ungroupElements: (groupId) => {
        const s = get()
        const group = s.elements[groupId] as GroupElement
        if (!group || group.type !== 'group') return

        const updatedElements = { ...s.elements }
        group.childIds.forEach((id) => {
          updatedElements[id] = { ...updatedElements[id], parentId: undefined }
        })
        delete updatedElements[groupId]

        const groupIdx = s.zOrder.indexOf(groupId)
        const newZOrder = [...s.zOrder]
        newZOrder.splice(groupIdx, 1, ...group.childIds)

        set({
          elements: updatedElements,
          zOrder: newZOrder,
          selectedIds: group.childIds,
        })
      },

      updateCanvas: (patch) =>
        set((s) => {
          const c = { ...s.canvas, ...patch }
          c.width  = mmToPx(c.widthMm,  c.dpi)
          c.height = mmToPx(c.heightMm, c.dpi)
          return { canvas: c }
        }),

      setGhostElement: (ghost) => set({ ghostElement: ghost }),
      setAlignmentGuides: (guides) => set({ alignmentGuides: guides }),
      setEditingTextId: (id) => set({ editingTextId: id }),

      loadDocument: (elements, zOrder, canvasPatch) => {
        set((s) => {
          const c = { ...s.canvas, ...canvasPatch }
          c.width  = mmToPx(c.widthMm,  c.dpi)
          c.height = mmToPx(c.heightMm, c.dpi)
          return {
            elements,
            zOrder,
            canvas: c,
            selectedIds: [],
            hoveredId: null,
            ghostElement: null,
            alignmentGuides: [],
            editingTextId: null,
          }
        })
        useDrawingStore.temporal.getState().clear()
      },
    }),
    {
      partialize: (state) => ({
        elements: state.elements,
        zOrder: state.zOrder,
      }),
      limit: 50,
    }
  )
)
