import { useRef, useState, useCallback } from 'react'
import { Save, FolderOpen } from 'lucide-react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useTabsStore, DEFAULT_CANVAS_SETTINGS } from '../store/useTabsStore'
import {
  serializeDocument,
  deserializeDocument,
  downloadDocument,
} from '../utils/serializer'
import { addRecentFile } from '../utils/recentFiles'

export function SaveLoad() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const elements     = useDrawingStore((s) => s.elements)
  const zOrder       = useDrawingStore((s) => s.zOrder)
  const canvas       = useDrawingStore((s) => s.canvas)

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const tabsStore  = useTabsStore.getState()
      const activeTab  = tabsStore.getActiveCanvasTab()
      const name       = activeTab?.name ?? 'drawing'

      const svgEl = document.querySelector('svg[data-drawing-canvas]') as SVGSVGElement | null
      const json  = await serializeDocument(name, canvas, elements, zOrder, svgEl ?? undefined)

      downloadDocument(name, json)

      // Update tab state + recent files
      const doc = JSON.parse(json)
      const thumbnail = doc?.meta?.thumbnail as string | undefined
      if (activeTab) {
        tabsStore.setTabModified(activeTab.id, false)
        if (thumbnail) tabsStore.setTabThumbnail(activeTab.id, thumbnail)
      }
      addRecentFile(name, doc, thumbnail)
    } finally {
      setSaving(false)
    }
  }, [canvas, elements, zOrder])

  function handleLoadClick() {
    setError(null)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const doc   = deserializeDocument(ev.target?.result as string)
        const name  = doc.meta?.name ?? file.name.replace(/\.label$/i, '')
        const snap  = {
          elements: doc.elements,
          zOrder:   doc.zOrder,
          canvas:   { ...DEFAULT_CANVAS_SETTINGS, ...doc.canvas },
        }
        useTabsStore.getState().newTab(name, snap)
        addRecentFile(name, doc, doc.meta?.thumbnail)
      } catch (err) {
        setError(String(err))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '4px 10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 12,
    cursor: 'pointer',
    flexShrink: 0,
  }

  return (
    <>
      <button style={btnStyle} onClick={handleSave} disabled={saving} title="Save as .label file">
        <Save size={14} />
        {saving ? '…' : 'Save'}
      </button>

      <button style={btnStyle} onClick={handleLoadClick} title="Open .label file">
        <FolderOpen size={14} />
        Open
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".label,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {error && (
        <div
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8,
            color: '#fecaca', fontSize: 13, padding: '10px 16px',
            zIndex: 9999, maxWidth: 400, textAlign: 'center',
          }}
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}
    </>
  )
}
