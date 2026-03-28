# SVG Label Designer

A browser-based vector label editor built for designing and printing barcode labels. The goal was to have a self-contained drawing tool that produces print-ready output at exact physical dimensions (mm), with first-class support for industrial barcode symbologies and ZPL (Zebra Programming Language) interchange.

---

## What you can do

### Draw and design
- **Shapes** — rectangle, ellipse, line with configurable fill, stroke color, and stroke width
- **Text** — free-form text with font size, weight, style, and alignment controls
- **Freehand** — pen tool for free drawing
- **Images** — insert raster images (PNG, JPG, etc.) scaled to fit

### Barcodes and codes
- **1D barcodes** — Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, PDF417
- **2D codes** — QR Code, Data Matrix, Aztec Code
- Control bar height, text inclusion, and text size per barcode element
- Bars and human-readable text scale independently when resizing

### Canvas / label settings
- Set exact label size in **millimeters** at 203 / 300 / 600 DPI
- Square or **rounded corners** — content is clipped to the corner shape
- Grid overlay and snap-to-element alignment guides
- Background color

### Editing tools
- **Select, move, resize** (8-handle resize + rotation)
- **Group / Ungroup** (Ctrl+G / Ctrl+Shift+G)
- **Z-order** — bring to front/back, step forward/backward
- **Duplicate** (Ctrl+D) and **Delete**
- **Undo / Redo** (Ctrl+Z / Ctrl+Y) — full history
- **Snapping** — elements snap to each other's edges and centers, and to canvas edges/center

### Multi-tab workflow
- Work on multiple labels simultaneously in separate tabs
- Each tab maintains its own canvas size, DPI, and element set

### ZPL integration
- **Export to ZPL** — convert the current label to Zebra ZPL code ready to send to a printer
- **Import from ZPL** — load a `.zpl` file and reconstruct the label as editable elements (rectangles, text, barcodes, QR codes)

### Export and print
- **SVG** — lossless vector export
- **JPG** — raster export
- **PDF** — print-ready PDF at the correct physical dimensions
- **Print dialog** — preview with correct mm dimensions and multi-copy support

---

## Tech stack

- React + TypeScript + Vite
- Zustand + zundo (state management + undo/redo)
- bwip-js (barcode rendering)
- jsPDF + svg2pdf.js (PDF export)
- lucide-react (icons)

## Development

```bash
npm install
npm run dev
```
