import type { LabelDocument } from './serializer'

export interface RecentFile {
  id: string
  name: string
  modified: string  // ISO 8601
  thumbnail?: string
  doc: LabelDocument
}

const STORAGE_KEY = 'svgdraw_recent_labels'
const MAX_RECENT = 20

export function getRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentFile[]
  } catch {
    return []
  }
}

export function addRecentFile(name: string, doc: LabelDocument, thumbnail?: string): void {
  try {
    const existing = getRecentFiles().filter((f) => f.name !== name)
    const entry: RecentFile = {
      id: crypto.randomUUID(),
      name,
      modified: new Date().toISOString(),
      thumbnail,
      doc,
    }
    const updated = [entry, ...existing].slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable (private mode, storage full, etc.)
  }
}

export function removeRecentFile(id: string): void {
  try {
    const updated = getRecentFiles().filter((f) => f.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}
