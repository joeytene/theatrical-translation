// How a viewer wants captions to look. Saved on this device only.
export type ViewerSettings = {
  fontSize: number // px
  position: 'top' | 'middle' | 'bottom'
  textColor: string
  bgColor: string
}

export const MIN_FONT = 18
export const MAX_FONT = 72

export const DEFAULT_SETTINGS: ViewerSettings = {
  fontSize: 32,
  position: 'bottom',
  textColor: '#ffffff',
  bgColor: '#000000',
}

export const PRESETS: { name: string; textColor: string; bgColor: string }[] = [
  { name: 'White on black', textColor: '#ffffff', bgColor: '#000000' },
  { name: 'Black on white', textColor: '#000000', bgColor: '#ffffff' },
  { name: 'Yellow on black', textColor: '#ffeb3b', bgColor: '#000000' },
  // Dim green: easy on the eyes in a dark theatre.
  { name: 'Green on black (dim)', textColor: '#2e8b4f', bgColor: '#000000' },
]

export function clampFont(n: number): number {
  return Math.min(MAX_FONT, Math.max(MIN_FONT, Math.round(n)))
}

const KEY = 'viewerSettings'

type Stored = { settings: ViewerSettings; seen: boolean }

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      const s = d?.settings ?? {}
      const pos = ['top', 'middle', 'bottom'].includes(s.position) ? s.position : DEFAULT_SETTINGS.position
      return {
        seen: d?.seen === true,
        settings: {
          fontSize: typeof s.fontSize === 'number' ? clampFont(s.fontSize) : DEFAULT_SETTINGS.fontSize,
          position: pos,
          textColor: typeof s.textColor === 'string' ? s.textColor : DEFAULT_SETTINGS.textColor,
          bgColor: typeof s.bgColor === 'string' ? s.bgColor : DEFAULT_SETTINGS.bgColor,
        },
      }
    }
  } catch {
    // Missing or corrupt: use defaults.
  }
  return { settings: DEFAULT_SETTINGS, seen: false }
}

function write(data: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage blocked: settings just won't persist.
  }
}

export function loadSettings(): ViewerSettings {
  return read().settings
}

export function saveSettings(settings: ViewerSettings) {
  write({ ...read(), settings: { ...settings, fontSize: clampFont(settings.fontSize) } })
}

// Has this device already seen the first-time setup panel?
export function hasSeenSetup(): boolean {
  return read().seen
}

export function markSetupSeen() {
  write({ ...read(), seen: true })
}
