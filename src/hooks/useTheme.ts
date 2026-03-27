import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'svgdraw-theme'
const THEMES: Theme[] = ['dark', 'light', 'system']

let listeners: Array<() => void> = []
let _theme: Theme = (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark'

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyToDOM(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.setAttribute('data-theme', resolved)
}

// Apply immediately on module load (prevents flash)
applyToDOM(_theme)

// Watch system preference changes when theme is 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (_theme === 'system') applyToDOM('system')
})

function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => { listeners = listeners.filter((l) => l !== cb) }
}

function getSnapshot(): Theme { return _theme }

export function setTheme(t: Theme) {
  _theme = t
  localStorage.setItem(STORAGE_KEY, t)
  applyToDOM(t)
  listeners.forEach((l) => l())
}

export function cycleTheme() {
  setTheme(THEMES[(THEMES.indexOf(_theme) + 1) % THEMES.length])
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot)
  return { theme, setTheme, cycleTheme }
}
