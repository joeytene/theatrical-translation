// Where the caption box sits and how big the text is. Saved on this device only.
// Box values are fractions (0-1) of the viewport so they survive rotation and resize.
export type Box = { x: number; y: number; w: number; h: number }

export type ViewerSettings = {
  fontSize: number // px
  box: Box
}

export const MIN_FONT = 18
export const MAX_FONT = 96

const PRESET_BOXES: Record<string, Box> = {
  top: { x: 0.04, y: 0.06, w: 0.92, h: 0.3 },
  middle: { x: 0.04, y: 0.35, w: 0.92, h: 0.3 },
  bottom: { x: 0.04, y: 0.64, w: 0.92, h: 0.3 },
}

export const DEFAULT_BOX: Box = PRESET_BOXES.bottom

export const DEFAULT_SETTINGS: ViewerSettings = { fontSize: 32, box: DEFAULT_BOX }

export function clampFont(n: number): number {
  return Math.min(MAX_FONT, Math.max(MIN_FONT, Math.round(n)))
}

const BOX_PADDING = 32 // px, top + bottom inside the box

// Keep the box at a usable size and fully inside the viewport (vw, vh in px).
export function clampBox(box: Box, vw: number, vh: number, fontSize: number): Box {
  if (!(vw > 0 && vh > 0)) return box // not measured yet
  const minW = Math.min(vw, Math.max(240, vw * 0.4)) / vw
  const minH = Math.min(vh, fontSize * 1.4 * 2 + BOX_PADDING) / vh
  const w = Math.min(1, Math.max(minW, box.w))
  const h = Math.min(1, Math.max(minH, box.h))
  return {
    w,
    h,
    x: Math.min(1 - w, Math.max(0, box.x)),
    y: Math.min(1 - h, Math.max(0, box.y)),
  }
}

const KEY = 'viewerSettings'

type Stored = { settings: ViewerSettings; seen: boolean }

const isFrac = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1

function readBox(s: Record<string, unknown>): Box {
  const b = s.box as Record<string, unknown> | undefined
  if (b && isFrac(b.x) && isFrac(b.y) && isFrac(b.w) && isFrac(b.h)) {
    return { x: b.x, y: b.y, w: b.w, h: b.h }
  }
  // Old settings stored top / middle / bottom.
  return PRESET_BOXES[s.position as string] ?? DEFAULT_BOX
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      const s = d?.settings ?? {}
      return {
        seen: d?.seen === true,
        settings: {
          fontSize: typeof s.fontSize === 'number' ? clampFont(s.fontSize) : DEFAULT_SETTINGS.fontSize,
          box: readBox(s),
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

// Has this device already finished the first-time watch setup?
export function hasSeenSetup(): boolean {
  return read().seen
}

export function markSetupSeen() {
  write({ ...read(), seen: true })
}
