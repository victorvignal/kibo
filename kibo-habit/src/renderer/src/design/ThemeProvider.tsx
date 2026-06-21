import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEMES, DEFAULT_THEME, tokensToCss, type Theme, type ThemeName } from './tokens'

interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'kuxy.theme'

/**
 * Provedor de tema. Aplica tokens via CSS variables no :root, permite
 * trocar tema em runtime sem reload.
 *
 * Pra criar tema novo: adicionar em tokens.ts (THEMES) e o setTheme
 * aceita pelo nome. Sem restart, sem rebuild.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_THEME
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null
    if (saved && saved in THEMES) return saved
    return DEFAULT_THEME
  })

  const theme = THEMES[themeName]

  useEffect(() => {
    // Injeta CSS variables no :root. Tailwind lê via var(--color-*).
    const styleId = 'kuxy-theme-vars'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = tokensToCss(theme)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, themeName)
    }
  }, [theme, themeName])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeName, setTheme: setThemeName }),
    [theme, themeName]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}