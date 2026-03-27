import { useEffect } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useTemporalStore } from '../store/temporalStore'
import type { LineElement } from '../types/elements'

export function useKeyboardShortcuts() {
  const store = useDrawingStore()
  const { undo, redo } = useTemporalStore()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      // Don't fire shortcuts when typing in inputs/textareas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') store.setEditingTextId(null)
        return
      }

      const ctrl = e.ctrlKey || e.metaKey

      // Tool shortcuts
      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 'v': store.setActiveTool('select'); break
          case 'r': store.setActiveTool('rect'); break
          case 'e': store.setActiveTool('circle'); break
          case 'l': store.setActiveTool('line'); break
          case 't': store.setActiveTool('text'); break
          case 'p': store.setActiveTool('freehand'); break
          case 'escape': store.clearSelection(); store.setActiveTool('select'); break
          case 'delete':
          case 'backspace':
            if (store.selectedIds.length > 0) {
              store.removeElements(store.selectedIds)
            }
            break
        }
      }

      // Arrow key nudge
      if (!ctrl && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const delta = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0
        const dy = e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0
        store.selectedIds.forEach((id) => {
          const el = store.elements[id]
          if (!el || el.locked) return
          if (el.type === 'line') {
            store.updateElement(id, {
              x1: (el as LineElement).x1 + dx,
              y1: (el as LineElement).y1 + dy,
              x2: (el as LineElement).x2 + dx,
              y2: (el as LineElement).y2 + dy,
              transform: { ...el.transform, x: el.transform.x + dx, y: el.transform.y + dy },
            } as Partial<LineElement>)
          } else {
            store.updateElement(id, { transform: { ...el.transform, x: el.transform.x + dx, y: el.transform.y + dy } })
          }
        })
        e.preventDefault()
      }

      // Ctrl shortcuts
      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) redo(); else undo()
            break
          case 'y':
            e.preventDefault()
            redo()
            break
          case 'a':
            e.preventDefault()
            store.setSelectedIds(store.zOrder.filter((id) => !store.elements[id]?.parentId))
            break
          case 'd':
            e.preventDefault()
            if (store.selectedIds.length > 0) store.duplicateElements(store.selectedIds)
            break
          case 'g':
            e.preventDefault()
            if (e.shiftKey) {
              if (store.selectedIds.length === 1 && store.elements[store.selectedIds[0]]?.type === 'group') {
                store.ungroupElements(store.selectedIds[0])
              }
            } else if (store.selectedIds.length >= 2) {
              store.groupElements(store.selectedIds)
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store, undo, redo])
}
