# SVG Drawing App — Implementation Plan

## Context
Build a new React SVG drawing application from scratch in an empty directory. The app provides a toolbar with shape tools (circle, rect, line, text, image, barcode/QR/DataMatrix), a drawing canvas with alignment guides, selection/resize/rotate handles, grouping, z-order control, and export to SVG/JPG/PDF.

**Stack:** Vite + React + TypeScript, shadcn/ui + Tailwind, Zustand + zundo (undo/redo), bwip-js (barcodes), react-qrcode-pretty (styled QR), @svg-drawing/react (freehand), jsPDF + svg2pdf.js (PDF export).

---

## File Structure

```
svgdraw/
├── index.html
├── vite.config.ts          # path alias @/ → src/
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json         # shadcn config
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   ├── elements.ts     # all element type definitions (see below)
    │   └── store.ts        # Zustand state + action interfaces
    ├── store/
    │   └── useDrawingStore.ts   # Zustand + zundo temporal middleware
    ├── components/
    │   ├── AppLayout.tsx        # 3-col CSS grid: Toolbar | Canvas | Properties
    │   ├── Toolbar/
    │   │   ├── Toolbar.tsx
    │   │   ├── ToolButton.tsx
    │   │   └── ColorPicker.tsx  # fill + stroke, shadcn Popover + color input
    │   ├── Canvas/
    │   │   ├── Canvas.tsx           # SVG root, zoom/pan <g>, mouse event hub
    │   │   ├── CanvasBackground.tsx # SVG <pattern> grid
    │   │   ├── ElementRenderer.tsx  # switch dispatch for element types
    │   │   ├── GhostElement.tsx     # preview during shape creation
    │   │   └── AlignmentGuides.tsx  # cyan snap lines layer
    │   ├── Elements/
    │   │   ├── CircleElement.tsx
    │   │   ├── RectElement.tsx
    │   │   ├── LineElement.tsx
    │   │   ├── TextElement.tsx      # double-click → foreignObject textarea edit
    │   │   ├── ImageElement.tsx
    │   │   ├── BarcodeElement.tsx   # inline bwip-js SVG paths
    │   │   ├── QRElement.tsx        # inline react-qrcode-pretty SVG
    │   │   ├── FreehandElement.tsx  # <path d={pathData}> from @svg-drawing/react
    │   │   └── GroupElement.tsx
    │   ├── Selection/
    │   │   ├── SelectionBox.tsx     # dashed border + 8 resize + 1 rotate handle
    │   │   ├── ResizeHandle.tsx
    │   │   └── RotateHandle.tsx     # circle 24px above top-center
    │   ├── Properties/
    │   │   ├── PropertiesPanel.tsx  # conditional render by element type
    │   │   └── BarcodeProperties.tsx
    │   └── ExportDialog/
    │       ├── ExportDialog.tsx
    │       ├── SVGExporter.ts
    │       ├── JPGExporter.ts
    │       └── PDFExporter.ts
    ├── hooks/
    │   ├── useCanvasInteraction.ts  # mouse state machine (see below)
    │   ├── useAlignmentGuides.ts   # snap detection + guide emission
    │   ├── useKeyboardShortcuts.ts # Delete, Ctrl+Z/Y, Ctrl+G, arrows
    │   └── useExport.ts
    └── utils/
        ├── geometry.ts             # BBox, hitTest, rotatedBBox, mergeBBoxes
        ├── barcodeRenderer.ts      # bwip-js → SVG string
        ├── idGenerator.ts          # nanoid wrapper
        └── colorUtils.ts
```

---

## Key Types (`src/types/elements.ts`)

```typescript
export type ElementType = 'circle'|'rect'|'line'|'text'|'image'|'barcode'|'qr'|'freehand'|'group'

export interface Transform { x: number; y: number; rotation: number }
export interface Style { fill: string; stroke: string; strokeWidth: number; opacity: number }
export interface BBox { x: number; y: number; width: number; height: number; cx: number; cy: number; right: number; bottom: number }

export interface BaseElement {
  id: string; type: ElementType; transform: Transform; style: Style;
  locked: boolean; visible: boolean; parentId?: string;
}

// CircleElement: transform.x/y = cx/cy; rx/ry for radii
// RectElement: transform.x/y = top-left; width/height/rx/ry
// LineElement: transform.x/y = origin; x1/y1/x2/y2 relative offsets
// TextElement: content/fontSize/fontFamily/textAnchor/width/height
// ImageElement: href (base64 dataURL)/width/height/naturalWidth/naturalHeight
// BarcodeElement: symbology/data/width/height/bwipOptions/cachedSvg/_rawWidth/_rawHeight
// QRElement: data/width/height/qrOptions{ecc,style,color,logo}/cachedSvg
// FreehandElement: pathData (SVG d attr)/bbox
// GroupElement: childIds/  (bbox derived, not stored)
```

---

## Zustand Store (`src/store/useDrawingStore.ts`)

```typescript
// State shape (temporal middleware from zundo partializes elements+zOrder only)
{
  elements: Record<string, DrawingElement>
  zOrder: string[]           // root-level IDs in paint order
  selectedIds: string[]
  activeTool: ToolType       // 'select'|'circle'|'rect'|'line'|'text'|'image'|'barcode'|'qr'|'freehand'
  defaultStyle: Style
  canvas: { width, height, zoom, panX, panY, showGrid, snapToElements, snapThreshold, backgroundColor }
  ghostElement: Partial<DrawingElement> | null   // NOT in history
  alignmentGuides: AlignmentGuide[]              // NOT in history
}

// Key actions:
addElement / updateElement / removeElements / duplicateElements
setSelectedIds / clearSelection
bringForward / sendBackward / bringToFront / sendToBack   // operate on zOrder array
groupElements(ids) → groupId / ungroupElements(groupId)
undo() / redo()   // delegated to zundo's useTemporalStore
```

---

## Canvas Mouse State Machine (`src/hooks/useCanvasInteraction.ts`)

```
IDLE
 ├─ mousedown on empty (select tool)  → RECT_SELECT
 ├─ mousedown on element (select tool) → DRAGGING
 ├─ mousedown on resize handle         → RESIZING
 ├─ mousedown on rotate handle         → ROTATING
 └─ mousedown (any shape tool)         → CREATING

CREATING   → mousemove: update ghostElement → mouseup: addElement, back to IDLE
RECT_SELECT → mousemove: update rubber-band rect → mouseup: select hits, IDLE
DRAGGING   → mousemove: apply delta + computeAlignmentGuides → mouseup: commit, IDLE
RESIZING   → mousemove: computeResize(handle, originalBBox, mouse) → mouseup: commit, IDLE
ROTATING   → mousemove: atan2(mouse-center) - startAngle + originalRot → mouseup: commit, IDLE
FREEHAND   → mousemove: append point → mouseup: extract pathData, addElement, IDLE
```

**Coordinate transform:** `(clientX - svgRect.left - panX) / zoom`

**Resize handle → dimension mapping:**
- `nw/ne/sw/se`: corner — moves opposite corner fixed
- `n/s`: top/bottom edge → changes y and height
- `e/w`: right/left edge → changes x and width
- All resize math in element-local space (undo rotation first, then apply)

**Rotate:** `angle = atan2(mouse - selectionCenter) - startAngle + originalRotation`; snap to 15° increments when Shift held

---

## Alignment Guides (`src/hooks/useAlignmentGuides.ts`)

For each non-selected element, compute 6 positions: `left, centerX, right, top, centerY, bottom`.
For the dragging element's proposed position, compare all 6 pairs.
If `|proposed - candidate| < snapThreshold (6px)`: snap delta and emit a guide.
Guides are full-width/height cyan lines rendered in `AlignmentGuides.tsx` above elements, below selection box.

---

## Barcode Rendering (`src/utils/barcodeRenderer.ts`)

```typescript
// bwip-js toSVG() → complete SVG string stored in BarcodeElement.cachedSvg
// Embedding: strip outer <svg> tag, inline the paths into a <g> with scale transform
// Re-rendered only when symbology/data/bwipOptions changes (in BarcodeProperties onChange)

// QR: renderToStaticMarkup(<QrcodeSVG value={data} {...qrOptions}/>) → cachedSvg
// Same inline embedding. Both approaches produce true vector SVG in export.
```

---

## Group Logic

- Children remain in `elements` with `parentId` set; only the group ID appears in `zOrder`
- All transforms stay in **world coordinates** (no parent-relative coords) — simplifies hit-test and alignment
- Moving group: propagate delta to all `childIds` transforms + group transform
- Bbox: `mergeBBoxes(childIds.map(id => getElementBBox(elements[id])))`
- Double-click on group: enter group mode, allow selecting individual children
- Ungroup: clear `parentId` on children, remove group from `elements`, insert children into `zOrder` at group's position

---

## Export

**SVG:** Clone SVG DOM → remove selection/guide/ghost elements → reset zoom/pan transform → `XMLSerializer.serializeToString()`

**JPG:** SVG string → `Blob` URL → `Image` → draw on offscreen `<canvas>` (fill bg first) → `canvas.toDataURL('image/jpeg', 0.92)`

**PDF:** Clean SVG clone → `new jsPDF({format:[wMm,hMm]})` → `pdf.svg(svgClone, {x:0,y:0,width:wMm,height:hMm})` → `pdf.save()`
(svg2pdf.js patches jsPDF via side-effect import; px→mm at 96dpi)

---

## Implementation Phases

1. **Scaffold** — `npm create vite@latest`, install all deps, configure Tailwind + shadcn + path aliases
2. **Types + Store** — `elements.ts`, `store.ts`, `useDrawingStore.ts` with zundo, `geometry.ts`, `idGenerator.ts`
3. **Canvas shell** — `AppLayout.tsx`, `Canvas.tsx` (SVG + zoom/pan `<g>`), `CanvasBackground.tsx`, wire interaction hook skeleton
4. **Element renderers** — CircleElement, RectElement, LineElement, TextElement, ImageElement, ElementRenderer
5. **Creation tools** — CREATING state, GhostElement, useElementCreation, image file picker → base64
6. **Selection + transforms** — SelectionBox + handles, DRAGGING, RESIZING, ROTATING, rubber-band RECT_SELECT
7. **Alignment guides** — computeAlignmentGuides, integrate into drag, AlignmentGuides render layer
8. **Toolbar + Properties** — Toolbar, ColorPicker (Popover), PropertiesPanel per element type, z-order buttons
9. **Barcode/QR** — barcodeRenderer.ts, BarcodeElement, QRElement, BarcodeProperties, QRDialog
10. **Freehand** — FREEHAND state + @svg-drawing/react integration, FreehandElement
11. **Group/Ungroup** — store actions, GroupElement renderer, double-click enter/exit, Ctrl+G / Ctrl+Shift+G
12. **Export** — SVGExporter, JPGExporter, PDFExporter, ExportDialog with shadcn Dialog
13. **Keyboard shortcuts + history** — useKeyboardShortcuts (Delete, Ctrl+Z/Y, Ctrl+G, arrows, Escape), zundo undo/redo wired to buttons
14. **Polish** — zoom controls (scroll wheel + buttons), pan (Space+drag), copy/paste, lock/visibility toggles

---

## Key Dependencies

```json
{
  "zustand": "^5",
  "zundo": "^2",
  "nanoid": "^5",
  "bwip-js": "^4",
  "react-qrcode-pretty": "latest",
  "@svg-drawing/react": "^4",
  "jspdf": "^2",
  "svg2pdf.js": "^2",
  "lucide-react": "latest",
  "tailwindcss": "^3",
  "@shadcn/ui": "via CLI"
}
```

## Verification

- Run `npm run dev` → app loads with empty canvas and toolbar
- Draw each shape type, confirm it appears as SVG element
- Select shape, drag → alignment guides appear, element snaps
- Resize and rotate handles → element updates correctly
- Group 2+ elements, move group, ungroup
- Z-order: add 3 overlapping rects, bring/send each
- Insert barcode (Code128) and QR code → visible in canvas
- Export: SVG opens in browser cleanly; JPG downloads; PDF opens in viewer
- Undo/redo through 5+ operations
