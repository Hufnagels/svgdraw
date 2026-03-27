import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDrawingStore } from '../../store/useDrawingStore'
import { useTemporalStore } from '../../store/temporalStore'
import type { ToolType } from '../../types/interaction'
import type { BarcodeElement, QRElement, ImageElement, BarcodeSymbology } from '../../types/elements'
import { generateId } from '../../utils/idGenerator'
import { ColorPicker } from './ColorPicker'
import { InsertCodeModal } from './InsertCodeModal'
import {
  MousePointer2, Circle, Square, Minus, Type, Image as ImageIcon,
  Barcode, QrCode, Pencil, Undo2, Redo2, Trash2, Group, Ungroup,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Grid, Grid2x2, Copy, FileCode2, FileUp, Cog
} from 'lucide-react'
import { ZPLDialog } from '../ZPLDialog'
import { ZPLImportDialog } from '../ZPLImportDialog'
import { LabelSettingsDialog } from './LabelSettingsDialog'

const tools: Array<{ tool: ToolType; icon: React.ReactNode; label: string }> = [
  { tool: 'select',   icon: <MousePointer2 size={18} />, label: 'Select (V)' },
  { tool: 'rect',     icon: <Square size={18} />,        label: 'Rectangle (R)' },
  { tool: 'circle',   icon: <Circle size={18} />,        label: 'Ellipse (E)' },
  { tool: 'line',     icon: <Minus size={18} />,         label: 'Line (L)' },
  { tool: 'text',     icon: <Type size={18} />,          label: 'Text (T)' },
  { tool: 'freehand', icon: <Pencil size={18} />,        label: 'Freehand (P)' },
]

type ModalMode = 'barcode' | 'qr' | 'datamatrix' | null

export function Toolbar() {
  const activeTool   = useDrawingStore((s) => s.activeTool)
  const setActiveTool = useDrawingStore((s) => s.setActiveTool)
  const defaultStyle = useDrawingStore((s) => s.defaultStyle)
  const setDefaultStyle = useDrawingStore((s) => s.setDefaultStyle)
  const selectedIds  = useDrawingStore((s) => s.selectedIds)
  const elements     = useDrawingStore((s) => s.elements)
  const removeElements     = useDrawingStore((s) => s.removeElements)
  const duplicateElements  = useDrawingStore((s) => s.duplicateElements)
  const setSelectedIds     = useDrawingStore((s) => s.setSelectedIds)
  const groupElements   = useDrawingStore((s) => s.groupElements)
  const ungroupElements = useDrawingStore((s) => s.ungroupElements)
  const bringToFront  = useDrawingStore((s) => s.bringToFront)
  const sendToBack    = useDrawingStore((s) => s.sendToBack)
  const bringForward  = useDrawingStore((s) => s.bringForward)
  const sendBackward  = useDrawingStore((s) => s.sendBackward)
  const addElement    = useDrawingStore((s) => s.addElement)
  const canvas        = useDrawingStore((s) => s.canvas)
  const updateCanvas  = useDrawingStore((s) => s.updateCanvas)
  const { undo, redo, pastStates, futureStates } = useTemporalStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [showZPL,       setShowZPL]       = useState(false)
  const [showZPLImport, setShowZPLImport] = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)
  const [showZplMenu,   setShowZplMenu]   = useState(false)
  const [zplMenuPos,    setZplMenuPos]    = useState({ top: 0, left: 0 })
  const zplBtnRef      = useRef<HTMLButtonElement>(null)
  const zplDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showZplMenu) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (!zplBtnRef.current?.contains(t) && !zplDropdownRef.current?.contains(t))
        setShowZplMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showZplMenu])

  function handleInsertImage() { fileInputRef.current?.click() }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const href = ev.target?.result as string
      const img = new window.Image()
      img.onload = () => {
        const maxW = 400
        const scale = Math.min(1, maxW / img.naturalWidth)
        const el: ImageElement = {
          id: generateId(), type: 'image', href,
          width: img.naturalWidth * scale,
          height: img.naturalHeight * scale,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          transform: { x: 100, y: 100, rotation: 0 },
          style: { fill: 'none', stroke: 'none', strokeWidth: 0, opacity: 1 },
          locked: false, visible: true,
        }
        addElement(el)
        setActiveTool('select')
      }
      img.src = href
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleModalInsert(
    symbology: BarcodeSymbology,
    data: string,
    result: { svgString: string; rawWidth: number; rawHeight: number }
  ) {
    const isQR = symbology === 'qrcode'
    const isDataMatrix = symbology === 'datamatrix' || symbology === 'azteccode'

    if (isQR) {
      const el: QRElement = {
        id: generateId(), type: 'qr', data,
        width: 150, height: 150,
        ecc: 'M', qrStyle: 'squares',
        fgColor: '#000000', bgColor: '#ffffff',
        cachedSvg: result.svgString,
        transform: { x: 100, y: 100, rotation: 0 },
        style: { ...defaultStyle },
        locked: false, visible: true,
      }
      addElement(el)
    } else if (isDataMatrix) {
      const el: BarcodeElement = {
        id: generateId(), type: 'barcode', symbology, data,
        width: 150, height: 150, includeText: false,
        cachedSvg: result.svgString,
        _rawWidth: result.rawWidth,
        _rawHeight: result.rawHeight,
        transform: { x: 100, y: 100, rotation: 0 },
        style: { ...defaultStyle },
        locked: false, visible: true,
      }
      addElement(el)
    } else {
      const el: BarcodeElement = {
        id: generateId(), type: 'barcode', symbology, data,
        width: 200, height: 80, includeText: true,
        cachedSvg: result.svgString,
        _rawWidth: result.rawWidth,
        _rawHeight: result.rawHeight,
        transform: { x: 100, y: 100, rotation: 0 },
        style: { ...defaultStyle },
        locked: false, visible: true,
      }
      addElement(el)
    }
    setActiveTool('select')
    setModalMode(null)
  }

  const canGroup   = selectedIds.length >= 2
  const canUngroup = selectedIds.length === 1 && elements[selectedIds[0]]?.type === 'group'
  const hasSel     = selectedIds.length > 0

  const btn = (title: string, onClick: () => void, icon: React.ReactNode, disabled = false, active = false, danger = false) => (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: 'none',
        background: active ? '#2563eb' : 'transparent',
        color: disabled ? 'var(--text-disabled)' : danger ? '#ef4444' : active ? 'white' : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s, color 0.12s',
        flexShrink: 0,
      }}
    >{icon}</button>
  )

  const divider = (
    <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px', flexShrink: 0, alignSelf: 'center' }} />
  )

  return (
    <>
      <div style={{
        minHeight: 44,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '4px 8px',
        gap: 2,
        overflowX: 'auto',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}>
        {/* Shape tools */}
        {tools.map(({ tool, icon, label }) => btn(label, () => setActiveTool(tool), icon, false, activeTool === tool))}

        {divider}

        {/* Insert */}
        {btn('Insert Image', handleInsertImage, <ImageIcon size={16} />)}
        {btn('Insert Barcode', () => setModalMode('barcode'), <Barcode size={16} />)}
        {btn('Insert QR Code', () => setModalMode('qr'), <QrCode size={16} />)}
        {btn('Insert DataMatrix / Aztec', () => setModalMode('datamatrix'), <Grid2x2 size={16} />)}

        {divider}

        {/* Colors */}
        <ColorPicker color={defaultStyle.fill}   onChange={(c) => setDefaultStyle({ fill: c })}   label="Fill" />
        <ColorPicker color={defaultStyle.stroke} onChange={(c) => setDefaultStyle({ stroke: c })} label="Stroke" />

        {divider}

        {/* Z-order */}
        {btn('Bring to Front',  () => bringToFront(selectedIds),  <ChevronsUp size={16} />,   !hasSel)}
        {btn('Bring Forward',   () => bringForward(selectedIds),  <ChevronUp size={16} />,    !hasSel)}
        {btn('Send Backward',   () => sendBackward(selectedIds),  <ChevronDown size={16} />,  !hasSel)}
        {btn('Send to Back',    () => sendToBack(selectedIds),    <ChevronsDown size={16} />, !hasSel)}

        {divider}

        {/* Group */}
        {btn('Group (Ctrl+G)',         () => groupElements(selectedIds),                   <Group size={16} />,   !canGroup)}
        {btn('Ungroup (Ctrl+Shift+G)', () => canUngroup && ungroupElements(selectedIds[0]), <Ungroup size={16} />, !canUngroup)}

        {divider}

        {/* History */}
        {btn('Undo (Ctrl+Z)', () => undo(), <Undo2 size={16} />, pastStates.length === 0)}
        {btn('Redo (Ctrl+Y)', () => redo(), <Redo2 size={16} />, futureStates.length === 0)}

        {divider}

        {btn('Duplicate (Ctrl+D)', () => { const ids = duplicateElements(selectedIds); setSelectedIds(ids) }, <Copy size={16} />, !hasSel)}
        {btn('Delete (Del)',  () => removeElements(selectedIds), <Trash2 size={16} />, !hasSel, false, true)}
        {btn('Toggle Grid',   () => updateCanvas({ showGrid: !canvas.showGrid }), <Grid size={16} />, false, canvas.showGrid)}

        {divider}

        {/* ZPL dropdown */}
        <button
          ref={zplBtnRef}
          title="ZPL"
          onClick={() => {
            const rect = zplBtnRef.current?.getBoundingClientRect()
            if (rect) setZplMenuPos({ top: rect.bottom + 4, left: rect.left })
            setShowZplMenu((v) => !v)
          }}
          style={{
            height: 36, padding: '0 8px',
            display: 'flex', alignItems: 'center', gap: 4,
            borderRadius: 6, border: 'none',
            background: showZplMenu ? 'var(--bg-input)' : 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 12, fontWeight: 500, flexShrink: 0,
          }}
        >
          <FileCode2 size={16} />
          <span>ZPL</span>
          <ChevronDown size={12} />
        </button>

        {btn('Label Settings', () => setShowSettings(true), <Cog size={16} />)}

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Insert code modal */}
      {modalMode && (
        <InsertCodeModal
          mode={modalMode}
          onInsert={handleModalInsert}
          onClose={() => setModalMode(null)}
        />
      )}

      {showZPL       && <ZPLDialog onClose={() => setShowZPL(false)} />}
      {showZPLImport && <ZPLImportDialog onClose={() => setShowZPLImport(false)} />}
      {showSettings  && <LabelSettingsDialog onClose={() => setShowSettings(false)} />}

      {showZplMenu && createPortal(
        <div
          ref={zplDropdownRef}
          style={{
            position: 'fixed', top: zplMenuPos.top, left: zplMenuPos.left,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 4, zIndex: 9999,
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {[
            { label: 'Export ZPL', icon: <FileCode2 size={14} />, action: () => { setShowZPL(true); setShowZplMenu(false) } },
            { label: 'Import ZPL', icon: <FileUp size={14} />,    action: () => { setShowZPLImport(true); setShowZplMenu(false) } },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 5, border: 'none',
                background: 'transparent', color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {icon}{label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
