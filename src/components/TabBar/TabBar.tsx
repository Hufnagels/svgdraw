import { useState, useRef, useEffect } from 'react'
import { useTabsStore, TEMPLATES_TAB_ID, LAST_EDITED_TAB_ID } from '../../store/useTabsStore'
import type { Tab } from '../../store/useTabsStore'
import { Plus, X, LayoutTemplate, Clock } from 'lucide-react'
import { NewTabDialog } from './NewTabDialog'

export function TabBar() {
  const tabs         = useTabsStore((s) => s.tabs)
  const activeTabId  = useTabsStore((s) => s.activeTabId)
  const closeTab     = useTabsStore((s) => s.closeTab)
  const switchTab    = useTabsStore((s) => s.switchTab)
  const setTabName   = useTabsStore((s) => s.setTabName)

  const [showNewDialog, setShowNewDialog] = useState(false)
  const canvasTabs   = tabs.filter((t) => t.type === 'canvas')

  return (
    <>
    <div style={{
      height: 38,
      background: 'var(--bg-app)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Fixed tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
        <FixedTab
          label="Templates"
          icon={<LayoutTemplate size={13} />}
          active={activeTabId === TEMPLATES_TAB_ID}
          onClick={() => switchTab(TEMPLATES_TAB_ID)}
        />
        <FixedTab
          label="Last Edited"
          icon={<Clock size={13} />}
          active={activeTabId === LAST_EDITED_TAB_ID}
          onClick={() => switchTab(LAST_EDITED_TAB_ID)}
        />
      </div>

      {/* Scrollable canvas tabs */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', overflowX: 'auto', overflowY: 'hidden' }}>
        {canvasTabs.map((tab) => (
          <CanvasTabPill
            key={tab.id}
            tab={tab}
            active={activeTabId === tab.id}
            canClose={canvasTabs.length > 1}
            onClick={() => switchTab(tab.id)}
            onClose={(e) => { e.stopPropagation(); closeTab(tab.id) }}
            onRename={(name) => setTabName(tab.id, name)}
          />
        ))}
      </div>

      {/* New tab */}
      <button
        title="New canvas (Ctrl+T)"
        onClick={() => setShowNewDialog(true)}
        style={{
          width: 38, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none',
          borderLeft: '1px solid var(--border)',
          color: '#ef4444', cursor: 'pointer',
        }}
      >
        <Plus size={15} />
      </button>
    </div>

    {showNewDialog && <NewTabDialog onClose={() => setShowNewDialog(false)} />}
    </>
  )
}

function FixedTab({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '0 14px',
        background: active ? 'var(--bg-surface)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: 12, cursor: 'pointer', flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function CanvasTabPill({ tab, active, canClose, onClick, onClose, onRename }: {
  tab: Tab
  active: boolean
  canClose: boolean
  onClick: () => void
  onClose: (e: React.MouseEvent) => void
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(tab.name)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(tab.name)
      inputRef.current?.select()
    }
  }, [editing, tab.name])

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed) onRename(trimmed)
    setEditing(false)
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(true)
  }

  return (
    <button
      onClick={editing ? undefined : onClick}
      onDoubleClick={handleDoubleClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 10px',
        background: active ? 'var(--bg-surface)' : 'transparent',
        border: 'none',
        borderRight: '1px solid var(--border)',
        borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 12, cursor: 'pointer', flexShrink: 0,
        minWidth: 80, maxWidth: 160,
      }}
    >
      {tab.modified && !editing && (
        <span style={{ color: '#f59e0b', fontSize: 16, lineHeight: 1, marginRight: 1 }}>•</span>
      )}

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename() }
            if (e.key === 'Escape') { setEditing(false) }
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          style={{
            flex: 1, minWidth: 0,
            background: 'var(--bg-input)',
            border: '1px solid #2563eb',
            borderRadius: 3,
            color: 'var(--text-primary)',
            fontSize: 12,
            padding: '1px 4px',
            outline: 'none',
          }}
        />
      ) : (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {tab.name}
        </span>
      )}

      {canClose && !editing && (
        <span
          onClick={onClose}
          title="Close tab"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: 3, flexShrink: 0,
            color: 'var(--text-muted)',
          }}
        >
          <X size={11} />
        </span>
      )}
    </button>
  )
}
