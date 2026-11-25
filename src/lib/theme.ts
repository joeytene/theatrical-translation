// Site-wide colours. Saved on this device only.
export type Theme = { textColor: string; bgColor: string }

export const PRESETS: { name: string; textColor: string; bgColor: string }[] = [
  { name: 'White on black', textColor: '#ffffff', bgColor: '#000000' },
  { name: 'Black on white', textColor: '#000000', bgColor: '#ffffff' },
  { name: 'Yellow on black', textColor: '#ffeb3b', bgColor: '#000000' },
  // Dim green: easy on the eyes in a dark theatre.
  { name: 'Green on black (dim)', textColor: '#2e8b4f', bgColor: '#000000' },
]

export const DEFAULT_THEME: Theme = { textColor: '#ffffff', bgColor: '#000000' }

const KEY = 'theme'
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

type Stored = { theme: Theme; seen: boolean }

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      return {
        seen: d?.seen === true,
        theme: {
          textColor: isHex(d?.theme?.textColor) ? d.theme.textColor : DEFAULT_THEME.textColor,
          bgColor: isHex(d?.theme?.bgColor) ? d.theme.bgColor : DEFAULT_THEME.bgColor,
        },
      }
    }
    // Migrate colours from the old per-watch settings; onboarding still shows once.
    const old = JSON.parse(localStorage.getItem('viewerSettings') ?? 'null')?.settings
    if (isHex(old?.textColor) && isHex(old?.bgColor)) {
      return { seen: false, theme: { textColor: old.textColor, bgColor: old.bgColor } }
    }
  } catch {
    // Missing or corrupt: use defaults.
  }
  return { seen: false, theme: DEFAULT_THEME }
}

function write(data: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage blocked: the theme just won't persist.
  }
}

export function loadTheme(): Theme {
  return read().theme
}

export function saveTheme(theme: Theme) {
  write({ ...read(), theme })
}

export function hasSeenTheme(): boolean {
  return read().seen
}

export function markThemeSeen() {
  write({ ...read(), seen: true })
}

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return l < 0.4
}

// Only --fg and --bg are set here; index.css derives the rest.
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.style.setProperty('--fg', theme.textColor)
  root.style.setProperty('--bg', theme.bgColor)
  root.style.colorScheme = isDark(theme.bgColor) ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bgColor)
}
