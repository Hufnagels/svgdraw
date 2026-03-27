import { useStore } from 'zustand'
import { useDrawingStore } from './useDrawingStore'

// Access the temporal (undo/redo) store from the drawing store
export function useTemporalStore() {
  const { undo, redo, pastStates, futureStates, clear } = useStore(useDrawingStore.temporal)
  return { undo, redo, pastStates, futureStates, clear }
}
