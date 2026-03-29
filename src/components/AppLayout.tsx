import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { Toolbar } from './Toolbar/Toolbar'
import { Canvas } from './Canvas/Canvas'
import { PropertiesPanel } from './Properties/PropertiesPanel'
import { Sidebar } from './Sidebar/Sidebar'
import { ExportDialog } from './ExportDialog/ExportDialog'
import { AvatarMenu } from './AvatarMenu'
import { SaveLoad } from './SaveLoad'
import { TabBar } from './TabBar/TabBar'
import { TemplatesView } from './TabBar/TemplatesView'
import { LastEditedView } from './TabBar/LastEditedView'
import { PrintDialog } from './PrintDialog'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useDrawingStore } from '../store/useDrawingStore'
import { useTabsStore, TEMPLATES_TAB_ID, LAST_EDITED_TAB_ID } from '../store/useTabsStore'
import { VITE_APP_NAME } from '../features/config';

export function AppLayout() {
  useKeyboardShortcuts()

  const updateCanvas   = useDrawingStore((s) => s.updateCanvas)
  const canvas         = useDrawingStore((s) => s.canvas)
  const activeTabId    = useTabsStore((s) => s.activeTabId)
  const [showPrint, setShowPrint] = useState(false)

  const isTemplates  = activeTabId === TEMPLATES_TAB_ID
  const isLastEdited = activeTabId === LAST_EDITED_TAB_ID
  const isCanvas     = !isTemplates && !isLastEdited

  // Mark tab modified when drawing store elements change
  useEffect(() => {
    return useDrawingStore.subscribe((state, prev) => {
      if (state.elements === prev.elements) return
      const { activeTabId: tid, tabs, setTabModified } = useTabsStore.getState()
      const t = tabs.find((tab) => tab.id === tid)
      if (t?.type === 'canvas' && !t.modified) setTabModified(tid, true)
    })
  }, [])

  function getSVGRef() {
    return document.querySelector('svg[data-drawing-canvas]') as SVGSVGElement | null
  }

  return (
    <>
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-app)',
      overflow: 'hidden',
    }}>
      {/* Top app bar */}
      <div style={{
        height: 44,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 16,
        flexShrink: 0,
      }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
          {VITE_APP_NAME}
        </div>
        <div style={{ flex: 1 }} />

        {/* Canvas size — only for canvas tabs */}
        {isCanvas && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={canvas.widthMm}
              min={1} max={2000} step={0.5}
              onChange={(e) => updateCanvas({ widthMm: parseFloat(e.target.value) || 1 })}
              style={{ width: 60, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', padding: '2px 6px', fontSize: 12, textAlign: 'center' }}
            />
            <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>×</span>
            <input
              type="number"
              value={canvas.heightMm}
              min={1} max={2000} step={0.5}
              onChange={(e) => updateCanvas({ heightMm: parseFloat(e.target.value) || 1 })}
              style={{ width: 60, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', padding: '2px 6px', fontSize: 12, textAlign: 'center' }}
            />
            <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>mm</span>
            <span style={{ color: 'var(--text-disabled)', fontSize: 10 }}>@ {canvas.dpi} dpi</span>
          </div>
        )}

        <SaveLoad />
       
        {isCanvas && (
          <>
            <ExportDialog getSVGRef={getSVGRef} />

            <button
              onClick={() => setShowPrint(true)}
              title="Print (Ctrl+P)"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Printer size={14} /> Print
            </button>
            
          </>
        )}

         <AvatarMenu />
      </div>

      {/* Tab bar */}
      <TabBar />

      {/* Content area */}
      {isTemplates && <TemplatesView />}
      {isLastEdited && <LastEditedView />}
      {isCanvas && (
        <>
          <Toolbar />
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Sidebar />
            <Canvas />
            <div style={{
              width: 220,
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border)',
              overflowY: 'auto',
              flexShrink: 0,
            }}>
              <PropertiesPanel />
            </div>
          </div>
        </>
      )}
    </div>

    {showPrint && <PrintDialog onClose={() => setShowPrint(false)} />}
    </>
  )
}
