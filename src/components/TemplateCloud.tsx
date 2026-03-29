/*
 * components/TemplateCloud.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cloud template management via /labeling/label-templates API.
 * Only active when authenticated (token present).
 *
 * Used by: TemplatesView.tsx
 */

import { useState, useEffect, useCallback } from 'react'
import { Cloud, CloudUpload, Trash2, Loader2 } from 'lucide-react'
import axios from 'axios'
import { useDrawingStore } from '../store/useDrawingStore'
import { useTabsStore, DEFAULT_CANVAS_SETTINGS } from '../store/useTabsStore'
import { useAuthStore } from '../store/useAuthStore'
import { serializeDocument, deserializeDocument } from '../utils/serializer'

interface CloudTemplate {
  id: string
  name: string
  thumbnail?: string
  widthMm?: number
  heightMm?: number
  data: string   // serialized LabelDocument JSON
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function TemplateCloud() {
  const token    = useAuthStore((s) => s.token)
  const elements = useDrawingStore((s) => s.elements)
  const zOrder   = useDrawingStore((s) => s.zOrder)
  const canvas   = useDrawingStore((s) => s.canvas)
  const newTab   = useTabsStore((s) => s.newTab)

  const [templates, setTemplates] = useState<CloudTemplate[]>([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.get<CloudTemplate[]>('/labeling/label-templates', {
        headers: authHeader(token),
      })
      setTemplates(res.data)
    } catch {
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const tabName = useTabsStore.getState().getActiveCanvasTab()?.name ?? 'Untitled'
      const svgEl = document.querySelector('svg[data-drawing-canvas]') as SVGSVGElement | null
      const json = await serializeDocument(tabName, canvas, elements, zOrder, svgEl ?? undefined)
      const doc = JSON.parse(json)
      await axios.post('/labeling/label-templates', {
        name: tabName,
        thumbnail: doc.meta?.thumbnail ?? null,
        widthMm: canvas.widthMm,
        heightMm: canvas.heightMm,
        data: json,
      }, { headers: authHeader(token) })
      await load()
    } catch {
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!token) return
    try {
      await axios.delete(`/labeling/label-templates/${id}`, { headers: authHeader(token) })
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Failed to delete template')
    }
  }

  function handleOpen(t: CloudTemplate) {
    try {
      const doc = deserializeDocument(t.data)
      newTab(t.name, {
        elements: doc.elements,
        zOrder: doc.zOrder,
        canvas: { ...DEFAULT_CANVAS_SETTINGS, ...doc.canvas },
      })
    } catch {
      setError('Failed to open template')
    }
  }

  if (!token) return null

  return (
    <div style={{ marginTop: 32 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Cloud size={14} style={{ color: 'var(--text-secondary)' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          Cloud Templates
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          title="Save current label to cloud"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', fontSize: 11, borderRadius: 5,
            border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text-secondary)',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving
            ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            : <CloudUpload size={12} />
          }
          Save current
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{error}</div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-disabled)' }}>No cloud templates saved yet.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {templates.map((t) => (
          <CloudTemplateCard
            key={t.id}
            template={t}
            onOpen={() => handleOpen(t)}
            onDelete={() => handleDelete(t.id)}
          />
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function CloudTemplateCard({
  template, onOpen, onDelete,
}: {
  template: CloudTemplate
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Thumbnail */}
      <div
        onClick={onOpen}
        style={{
          height: 90, background: '#fff', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {template.thumbnail
          ? <img src={template.thumbnail} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          : <Cloud size={24} style={{ color: '#ccc' }} />
        }
      </div>

      {/* Info + delete */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }} onClick={onOpen}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {template.name}
          </div>
          {template.widthMm && template.heightMm && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {template.widthMm} × {template.heightMm} mm
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Delete"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-disabled)', padding: 2, display: 'flex', flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-disabled)')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
