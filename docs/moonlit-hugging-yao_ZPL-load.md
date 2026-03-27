# ZPL Import Feature

## Context
The app already exports drawings to ZPL via `zplConverter.ts` + `ZPLDialog`. The user wants the reverse: load a `.zpl` file and reconstruct drawing elements from it — the "load" counterpart to the existing "save as ZPL" workflow.

---

## Coordinate System
The ZPL exporter uses `d(px, dpi) = Math.round(px * dpi / 96)` to convert canvas pixels → ZPL dots.
Import reversal: `canvasPx = zplDots * 96 / dpi`

Canvas dimensions recovered from `^PW` / `^LL`:
```
widthPx  = ^PW * 96 / dpi
widthMm  = widthPx * 25.4 / dpi
```
Stored via `mmToPx(widthMm, dpi)` + `DEFAULT_CANVAS_SETTINGS` spread.

---

## Files to Create

### 1. `src/utils/zplParser.ts`

Parse ZPL text → canvas dimensions + elements.

**Algorithm:**
1. Regex-extract `^PW{n}` and `^LL{n}` for canvas size
2. Tokenize by `^` — each token is `"CMD params"`
3. State machine tracking `pending`:

```
FO{x},{y}            → set pendingX, pendingY
GB{w},{h},{t},{c},{r}→ classify (see table) + possibly merge with prev GB at same FO
A0N,{fh},{fw}        → pendingFontH, pendingFontW
FB{fw},1,0,{j}       → pendingJustify
BC/B3/BE/B8/BU/BUE/B7 → pendingBarcodeSymbology + params
BQN,2,{mag},{ecc}    → pendingQR
FD{content}          → pendingData
FS                   → finalize current element, push to result
```

**`^GB` classification table:**
| Condition | Element |
|-----------|---------|
| `rounding == 8` | circle / ellipse |
| `rounding == 0` AND `h == thickness` | horizontal line |
| `rounding == 0` AND `w == thickness` | vertical line |
| `thickness >= min(w,h)` (solid fill) | rect fill block |
| `thickness < min(w,h)` (border only) | stroke-only block |

**Fill+stroke merging:** Exporter emits fill then stroke at the same `^FO` position. If two consecutive `^GB` share the same `x,y` → merge into one element (fill color + stroke color + strokeWidth).

**QR `^FD` content format:** `"{ecc}A,{data}"` → strip prefix to recover `data`.

**Color:** `'B'` → `'#000000'`, `'W'` → `'#ffffff'`

**Barcode symbology map (FD command → symbology string):**
`BCN` → `code128`, `B3N` → `code39`, `BEN` → `ean13`, `B8N` → `ean8`, `BUNN` → `upca`, `BUEN` → `upce`, `B7N` → `pdf417`

**Skipped:** `^XA`, `^XZ`, `^CI28`, `^GF` (graphics), `^FX` (comments) — silently ignored.

**Export:**
```typescript
export interface ZPLParseResult {
  widthMm: number
  heightMm: number
  elements: Record<string, DrawingElement>
  zOrder: string[]
}
export function parseZPL(zpl: string, dpi: DPI): ZPLParseResult
```

---

### 2. `src/components/ZPLImportDialog.tsx`

Modal (same visual style as `ZPLDialog.tsx`):
- Header: "Import ZPL" + X close button
- DPI selector (203 / 300 / 600) defaulting to `canvas.dpi`
- "Choose .zpl file" button → hidden `<input type="file" accept=".zpl,.txt">`
- On file selected: `FileReader.readAsText` → `parseZPL(text, dpi)` → `useTabsStore.getState().newTab(filename, snap)` → `onClose()`
- Error message if parse fails or returns 0 elements

---

## Files to Modify

### 3. `src/components/Toolbar/Toolbar.tsx`

- Add `FileUp` to lucide imports
- Add `import { ZPLImportDialog } from '../ZPLImportDialog'`
- Add state: `const [showZplImport, setShowZplImport] = useState(false)`
- Add toolbar button immediately after existing ZPL Export button:
  `{btn('ZPL Import', () => setShowZplImport(true), <FileUp size={16} />)}`
- Mount: `{showZplImport && <ZPLImportDialog onClose={() => setShowZplImport(false)} />}`

---

## Key References
- `src/utils/zplConverter.ts` — logic to reverse
- `src/utils/units.ts` — `DPI_OPTIONS`, `type DPI`, `mmToPx`
- `src/utils/idGenerator.ts` — `generateId()` for element IDs
- `src/components/ZPLDialog.tsx` — visual style to match
- `src/components/SaveLoad.tsx` — file-read + newTab pattern
- `src/store/useTabsStore.ts` — `newTab(name, snap)` + `DEFAULT_CANVAS_SETTINGS`

---

## Verification
1. Export a label with rect, circle, text, barcode, QR → download `.zpl`
2. ZPL Import → select the file at the matching DPI → new tab opens
3. Elements at correct positions and sizes, canvas dimensions match
4. `npx tsc --noEmit` — no TypeScript errors
