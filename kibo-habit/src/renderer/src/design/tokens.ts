/**
 * Design tokens do KUXY.
 *
 * SINGLE SOURCE OF TRUTH pra toda decisão visual. Tudo no Tailwind, nos
 * components e no CSS custom properties vem daqui. Mudou aqui, mudou em
 * todo o app. Sem isso, paleta vira um Frankenstein de hex hardcoded
 * espalhado em 15 arquivos.
 *
 * Como funciona:
 *   - tailwind.config.js consome este arquivo via build-time import
 *   - index.css injeta :root com CSS variables pra casos onde o Tailwind
 *     não chega (recharts, lucide-react com stroke customizado, etc.)
 *   - Componentes nunca referenciam hex diretamente — sempre classe
 *     semântica (bg-surface, text-muted, border-strong, etc.)
 *
 * Pra criar um tema novo (light mode, cores diferentes, etc):
 *   1. Cria um novo objeto Theme em themes/
 *   2. Exporta em THEMES
 *   3. Troca o default em <ThemeProvider>
 *   Funcionalidade não toca.
 */

export type Theme = {
  name: string
  colors: {
    // surfaces
    bg: string
    bgSubtle: string
    bgCard: string
    bgHover: string
    // borders
    border: string
    borderStrong: string
    // text
    text: string
    textMuted: string
    textSubtle: string
    // brand
    accent: string
    accentHover: string
    accentSoft: string // rgba/alpha pra fundos sutis
    // status
    success: string
    danger: string
    warning: string
    // misc
    scrim: string // fundo de modais
  }
  radii: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  spacing: {
    sidebarWidth: string
    topbarHeight: string
  }
  font: {
    sans: string
    mono: string
  }
  shadow: {
    card: string
    pop: string
  }
}

// Tema dark (default). É o que tá rodando agora no app.
export const DARK: Theme = {
  name: 'dark',
  colors: {
    bg: '#0a0a0f',
    bgSubtle: '#101018',
    bgCard: '#15151f',
    bgHover: '#1c1c28',
    border: '#22222f',
    borderStrong: '#2d2d3d',
    text: '#e7e7ee',
    textMuted: '#8b8b9a',
    textSubtle: '#5e5e6e',
    accent: '#a855f7',
    accentHover: '#9333ea',
    accentSoft: 'rgba(168, 85, 247, 0.12)',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    scrim: 'rgba(0, 0, 0, 0.6)'
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px'
  },
  spacing: {
    sidebarWidth: '240px',
    topbarHeight: '56px'
  },
  font: {
    sans: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace'
  },
  shadow: {
    card: '0 1px 0 0 rgba(255, 255, 255, 0.03) inset, 0 0 0 1px rgba(255, 255, 255, 0.04)',
    pop: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)'
  }
}

// Tema light (placeholder — pronto pra trocar via ThemeProvider quando quiser)
export const LIGHT: Theme = {
  name: 'light',
  colors: {
    bg: '#fafafb',
    bgSubtle: '#f3f3f7',
    bgCard: '#ffffff',
    bgHover: '#ececf2',
    border: '#e5e5ec',
    borderStrong: '#d0d0db',
    text: '#1a1a22',
    textMuted: '#6b6b78',
    textSubtle: '#9b9ba6',
    accent: '#9333ea',
    accentHover: '#7e22ce',
    accentSoft: 'rgba(147, 51, 234, 0.10)',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#d97706',
    scrim: 'rgba(0, 0, 0, 0.35)'
  },
  radii: DARK.radii,
  spacing: DARK.spacing,
  font: DARK.font,
  shadow: {
    card: '0 0 0 1px rgba(0, 0, 0, 0.04)',
    pop: '0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)'
  }
}

export const THEMES = {
  dark: DARK,
  light: LIGHT
} as const

export type ThemeName = keyof typeof THEMES

export const DEFAULT_THEME: ThemeName = 'dark'

/**
 * Gera o conteúdo do :root em CSS. Cada token vira uma variável
 * `--color-bg`, `--color-accent`, etc.
 *
 * Isso permite que CSS inline (recharts, transitions, keyframes)
 * acesse os tokens via var(--color-bg) sem precisar importar TS.
 */
export function tokensToCss(theme: Theme): string {
  const lines: string[] = []
  for (const [k, v] of Object.entries(theme.colors)) {
    lines.push(`--color-${k}: ${v};`)
  }
  for (const [k, v] of Object.entries(theme.radii)) {
    lines.push(`--radius-${k}: ${v};`)
  }
  lines.push(`--sidebar-width: ${theme.spacing.sidebarWidth};`)
  lines.push(`--topbar-height: ${theme.spacing.topbarHeight};`)
  lines.push(`--font-sans: ${theme.font.sans};`)
  lines.push(`--font-mono: ${theme.font.mono};`)
  lines.push(`--shadow-card: ${theme.shadow.card};`)
  lines.push(`--shadow-pop: ${theme.shadow.pop};`)
  return `:root {\n  ${lines.join('\n  ')}\n}\n`
}

/** Acessa um token em runtime (use em canvas, gradient inline, etc.). */
export function token<K extends keyof Theme['colors']>(theme: Theme, key: K): string {
  return theme.colors[key]
}