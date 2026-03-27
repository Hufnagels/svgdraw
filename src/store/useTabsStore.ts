import { create } from 'zustand'
import { useDrawingStore, type CanvasSettings } from './useDrawingStore'
import type { DrawingElement } from '../types/elements'
import { mmToPx } from '../utils/units'

export const TEMPLATES_TAB_ID = '__templates__'
export const LAST_EDITED_TAB_ID = '__last_edited__'

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  widthMm: 100, heightMm: 50, dpi: 203,
  width: mmToPx(100, 203), height: mmToPx(50, 203),
  zoom: 1, panX: 0, panY: 0,
  showGrid: true, snapToElements: true, snapThreshold: 6,
  backgroundColor: '#ffffff', borderRadius: 0,
}

export interface CanvasSnapshot {
  elements: Record<string, DrawingElement>
  zOrder: string[]
  canvas: CanvasSettings
}

export interface Tab {
  id: string
  type: 'canvas' | 'templates' | 'last-edited'
  name: string
  snapshot?: CanvasSnapshot
  thumbnail?: string
  modified: boolean
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string

  newTab: (name?: string, snapshot?: CanvasSnapshot) => string
  closeTab: (id: string) => void
  switchTab: (id: string) => void
  setTabName: (id: string, name: string) => void
  setTabModified: (id: string, modified: boolean) => void
  setTabThumbnail: (id: string, dataUrl: string) => void
  getActiveCanvasTab: () => Tab | null
}

const initialTabId = crypto.randomUUID()

function snapshotOutgoing(state: ReturnType<typeof useTabsStore.getState>) {
  const { activeTabId, tabs } = state
  const outgoing = tabs.find((t) => t.id === activeTabId)
  if (outgoing?.type !== 'canvas') return

  const ds = useDrawingStore.getState()
  const snap: CanvasSnapshot = { elements: ds.elements, zOrder: ds.zOrder, canvas: ds.canvas }
  useTabsStore.setState((s) => ({
    tabs: s.tabs.map((t) => t.id === activeTabId ? { ...t, snapshot: snap } : t),
  }))
}

function loadIncoming(snap: CanvasSnapshot | undefined) {
  useDrawingStore.getState().loadDocument(
    snap?.elements ?? {},
    snap?.zOrder ?? [],
    snap?.canvas ?? DEFAULT_CANVAS_SETTINGS,
  )
}

export const useTabsStore = create<TabsState>()((set, get) => ({
  tabs: [{ id: initialTabId, type: 'canvas', name: 'Untitled', modified: false }],
  activeTabId: initialTabId,

  newTab: (name = 'Untitled', snapshot) => {
    snapshotOutgoing(get())
    const id = crypto.randomUUID()
    const tab: Tab = { id, type: 'canvas', name, snapshot, modified: false }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: id }))
    loadIncoming(snapshot)
    return id
  },

  closeTab: (id) => {
    const { tabs, activeTabId, switchTab, newTab } = get()
    if (id === TEMPLATES_TAB_ID || id === LAST_EDITED_TAB_ID) return

    const canvasTabs = tabs.filter((t) => t.type === 'canvas')

    // Last canvas tab: replace with a blank one instead of blocking
    if (canvasTabs.length === 1 && canvasTabs[0].id === id) {
      newTab('Untitled')
      set((s) => ({ tabs: s.tabs.filter((t) => t.id !== id) }))
      return
    }

    const idx = canvasTabs.findIndex((t) => t.id === id)
    const next = canvasTabs[idx + 1] ?? canvasTabs[idx - 1]

    if (activeTabId === id && next) switchTab(next.id)
    set((s) => ({ tabs: s.tabs.filter((t) => t.id !== id) }))
  },

  switchTab: (targetId) => {
    const { activeTabId, tabs } = get()
    if (targetId === activeTabId) return

    snapshotOutgoing(get())
    set({ activeTabId: targetId })

    const incoming = tabs.find((t) => t.id === targetId)
    if (incoming?.type === 'canvas') loadIncoming(incoming.snapshot)
  },

  setTabName: (id, name) =>
    set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, name } : t) })),

  setTabModified: (id, modified) =>
    set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, modified } : t) })),

  setTabThumbnail: (id, dataUrl) =>
    set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, thumbnail: dataUrl } : t) })),

  getActiveCanvasTab: () => {
    const { tabs, activeTabId } = get()
    const t = tabs.find((t) => t.id === activeTabId)
    return t?.type === 'canvas' ? t : null
  },
}))
