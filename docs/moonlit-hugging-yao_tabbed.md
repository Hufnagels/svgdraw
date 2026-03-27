# SVGDraw — Tabbed Interface Plan

## Context
Add a tabbed interface to the existing SVGDraw app. The existing single-canvas global store (`useDrawingStore`) stays unchanged — a new `useTabsStore` acts as a coordinator that snapshots state out of the drawing store before tab switches and pours a different snapshot back in via the existing `loadDocument()` action.

---

## New Layout

```
┌────────────────────────────────────────────────┐
│  App bar (44px)                                │
├────────────────────────────────────────────────┤
│  Tab bar (38px)                                │
│  [Templates] [Last Edited] | [Tab1 ×][Tab2 ×][+] │
├────────────────────────────────────────────────┤
│  Toolbar (46px) — only when canvas tab active  │
├──────────┬─────────────────────────┬───────────┤
│ Sidebar  │  Canvas  OR  Gallery    │ Properties│
└──────────┴─────────────────────────┴───────────┘
```

---

## Files to Create

### 1. `src/utils/recentFiles.ts`
localStorage helper. No app dependencies except `EtikettDocument` type from `serializer.ts`.

```typescript
export interface RecentFile { id: string; name: string; modified: string; thumbnail?: string; doc: EtikettDocument }
export function getRecentFiles(): RecentFile[]   // reads localStorage, returns [] on error
export function addRecentFile(name, doc, thumbnail?): void  // prepend, dedup by name, trim to 20
export function removeRecentFile(id: string): void
```
- All localStorage calls wrapped in try/catch (private mode safety).
- Dedup: remove existing entry with same `name` before prepending.
- Key: `'svgdraw_recent_files'`

---

### 2. `src/store/useTabsStore.ts`
New Zustand store. Uses `useDrawingStore.getState()` directly (outside React — established pattern in this codebase).

```typescript
export const TEMPLATES_TAB_ID = '__templates__'
export const LAST_EDITED_TAB_ID = '__last_edited__'

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 1200, height: 800, zoom: 1, panX: 0, panY: 0,
  showGrid: true, snapToElements: true, snapThreshold: 6, backgroundColor: '#ffffff',
}

export interface CanvasSnapshot { elements, zOrder, canvas: CanvasSettings }

export interface Tab {
  id: string
  type: 'canvas' | 'templates' | 'last-edited'
  name: string
  snapshot?: CanvasSnapshot   // undefined = blank canvas
  thumbnail?: string
  modified: boolean
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string
  newTab(name?, snapshot?): string        // snapshots outgoing, loads incoming, returns new id
  closeTab(id: string): void              // no-op if last canvas tab; switches to adjacent first
  switchTab(id: string): void             // snapshots outgoing canvas tab, loads incoming
  setTabName(id, name): void
  setTabModified(id, modified): void
  setTabThumbnail(id, dataUrl): void
  getActiveCanvasTab(): Tab | null
}
```

**`switchTab` logic:**
1. If `activeTabId` is a canvas tab → snapshot current `useDrawingStore.getState()` into `tabs[activeTabId].snapshot`
2. Set `activeTabId = targetId`
3. If `targetId` is a canvas tab → call `useDrawingStore.getState().loadDocument(snap?.elements ?? {}, snap?.zOrder ?? [], snap?.canvas ?? DEFAULT_CANVAS_SETTINGS)`
4. If `targetId` is a fixed tab (`templates`/`last-edited`) → no drawing store interaction

**`newTab` logic:** same as `switchTab` for outgoing snapshot, then create new Tab and add to `tabs[]`, set as active, call `loadDocument` with the new snapshot (or blank).

**`closeTab` guard:** `if (canvasTabs.length === 1) return` — prevent closing last tab.

**Initial state:** one canvas tab `{ id: nanoid(10), type:'canvas', name:'Untitled', modified:false }`, drawing store already holds blank state so no `loadDocument` needed on startup.

---

### 3. `src/components/TabBar/TabBar.tsx`
Height 38px. Two sections separated by a vertical divider:

- **Left (fixed):** `[⬜ Templates]` `[🕐 Last Edited]` — uses `LayoutTemplate` + `Clock` icons from lucide
- **Middle (scrollable):** canvas tab pills — name (max-width 120px, ellipsis) + optional modified dot `•` + `×` close button (hidden when only 1 tab)
- **Right:** `[+]` new tab button

Active tab: `background: var(--bg-surface)`, `borderBottom: 2px solid #2563eb`.
Inactive: `background: transparent`, hover highlight.

---

### 4. `src/components/TabBar/TemplatesView.tsx`
Hardcoded templates:

| Name | Width × Height |
|---|---|
| A4 Page | 794 × 1123 px |
| Label 50×25mm | 189 × 94 px |
| Business Card 85×54mm | 321 × 204 px |
| Square 100×100mm | 378 × 378 px |

Card grid (`auto-fill, minmax(180px, 1fr)`). Each card shows a white rectangle preview (aspect-ratio matched, max 120px wide) + name + dimensions. Click calls `useTabsStore.newTab(name, { elements:{}, zOrder:[], canvas:{...DEFAULT_CANVAS_SETTINGS, width, height} })`.

---

### 5. `src/components/TabBar/LastEditedView.tsx`
Reads `getRecentFiles()` into local state. Card grid same as TemplatesView. Each card shows:
- Thumbnail (`<img>`) or grey placeholder
- File name
- Relative date (`Today` / `Yesterday` / `N days ago` / `Nw ago` / locale date)
- `×` delete button (calls `removeRecentFile`, refreshes list)

Click calls `useTabsStore.newTab(name, { elements: doc.elements, zOrder: doc.zOrder, canvas: {...DEFAULT_CANVAS_SETTINGS, ...doc.canvas} })`.

Note: `doc.canvas` only has `width/height/backgroundColor/showGrid/snap*` — spreading over `DEFAULT_CANVAS_SETTINGS` fills in `zoom/panX/panY` with defaults (Canvas ResizeObserver will auto-fit anyway).

---

## Files to Modify

### 6. `src/components/AppLayout.tsx`
- Import `TabBar`, `TemplatesView`, `LastEditedView`, `useTabsStore`, `TEMPLATES_TAB_ID`, `LAST_EDITED_TAB_ID`
- Read `activeTabId` from `useTabsStore`
- Insert `<TabBar />` between TopBar and Toolbar
- Conditionally render:
  - Canvas tab: `<Toolbar /> + <main>(<Sidebar /><Canvas /><PropertiesPanel />)</main>`
  - Templates tab: `<TemplatesView />`
  - Last Edited tab: `<LastEditedView />`
- Hide canvas size inputs and `<ExportDialog />` when on non-canvas tabs
- Add subscription to mark tab modified on drawing store changes:
```typescript
useEffect(() => {
  return useDrawingStore.subscribe(
    (s) => s.elements,
    () => {
      const { activeTabId, tabs, setTabModified } = useTabsStore.getState()
      const t = tabs.find((t) => t.id === activeTabId)
      if (t?.type === 'canvas' && !t.modified) setTabModified(activeTabId, true)
    }
  )
}, [])
```

### 7. `src/components/SaveLoad.tsx`
- **Save:** use `activeTab.name` (from `useTabsStore.getState().getActiveCanvasTab()`) as filename; after download, parse the JSON to extract thumbnail, then call `setTabName`, `setTabModified(false)`, `setTabThumbnail`, and `addRecentFile`.
- **Load:** instead of calling `loadDocument` directly, call `useTabsStore.getState().newTab(filename, snap)` then `addRecentFile`.

---

## Implementation Order

| Step | File | Notes |
|---|---|---|
| 1 | `src/utils/recentFiles.ts` | No app deps |
| 2 | `src/store/useTabsStore.ts` | Depends on `useDrawingStore` |
| 3 | `src/components/TabBar/TabBar.tsx` | Depends on `useTabsStore` |
| 4 | `src/components/TabBar/TemplatesView.tsx` | Depends on `useTabsStore` |
| 5 | `src/components/TabBar/LastEditedView.tsx` | Depends on `useTabsStore`, `recentFiles` |
| 6 | `src/components/SaveLoad.tsx` | Modify — depends on `useTabsStore`, `recentFiles` |
| 7 | `src/components/AppLayout.tsx` | Modify — integrates everything |

---

## Key Edge Cases

- **Closing last tab:** blocked (`canvasTabs.length === 1` guard)
- **Canvas unmount/remount on tab switch:** `ResizeObserver` re-fires `fitCanvas` on Canvas remount — auto-fits restored canvas. Acceptable UX.
- **`editingTextId` on tab switch:** already reset to `null` by `loadDocument` in `useDrawingStore`
- **`localStorage` unavailable:** all calls try/caught, `getRecentFiles()` returns `[]`
- **Tab `modified` dot:** shown in tab pill when `tab.modified === true`; cleared on save

---

## Verification

1. App loads with one canvas tab "Untitled" — draw something
2. Click **+** → new blank canvas tab opens, previous drawing saved in first tab
3. Switch back to first tab → drawing restored correctly
4. Click **Templates** → gallery shown, toolbar hidden
5. Click a template card → new canvas tab opens with correct canvas dimensions
6. Click **Last Edited** (empty initially) → "No recent files"
7. Save a file → tab name/thumbnail updates, file appears in Last Edited
8. Click file in Last Edited → opens as new canvas tab with content restored
9. Close a tab (× button) → adjacent tab becomes active
10. `npm run build` passes with no TypeScript errors
