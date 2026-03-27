import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { getRecentFiles, removeRecentFile, type RecentFile } from '../../utils/recentFiles'
import { useTabsStore, DEFAULT_CANVAS_SETTINGS } from '../../store/useTabsStore'

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString()
}

export function LastEditedView() {
  const [files, setFiles] = useState<RecentFile[]>(() => getRecentFiles())
  const newTab = useTabsStore((s) => s.newTab)

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeRecentFile(id)
    setFiles(getRecentFiles())
  }, [])

  const handleOpen = useCallback((f: RecentFile) => {
    newTab(f.name, {
      elements: f.doc.elements,
      zOrder:   f.doc.zOrder,
      canvas:   { ...DEFAULT_CANVAS_SETTINGS, ...f.doc.canvas },
    })
  }, [newTab])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32, background: 'var(--bg-app)' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Last Edited</div>

      {files.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent files.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {files.map((f) => (
            <RecentCard key={f.id} file={f} onOpen={() => handleOpen(f)} onDelete={(e) => handleDelete(f.id, e)} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecentCard({ file, onOpen, onDelete }: { file: RecentFile; onOpen: () => void; onDelete: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        position: 'relative',
      }}
    >
      {/* Delete button */}
      <button
        onClick={onDelete}
        title="Remove from list"
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', borderRadius: 3,
          color: 'var(--text-muted)', cursor: 'pointer',
        }}
      >
        <X size={12} />
      </button>

      {/* Thumbnail or placeholder */}
      {file.thumbnail ? (
        <img
          src={file.thumbnail}
          alt={file.name}
          style={{ width: 120, height: 100, objectFit: 'contain', borderRadius: 2, border: '1px solid var(--border)', background: '#fff' }}
        />
      ) : (
        <div style={{ width: 120, height: 100, background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 2, flexShrink: 0 }} />
      )}

      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {relativeDate(file.modified)}
        </div>
      </div>
    </div>
  )
}
