import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { applyTheme, loadTheme, saveTheme, type Theme } from '../lib/theme'

type Ctx = { theme: Theme; setTheme: (t: Theme) => void }
const ThemeContext = createContext<Ctx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(loadTheme)
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    saveTheme(t)
    applyTheme(t)
  }, [])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme needs a ThemeProvider')
  return ctx
}
