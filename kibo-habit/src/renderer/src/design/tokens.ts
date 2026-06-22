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
    accentLight: string // tom claro do accent (pra gradient em chart)
    accentDark: string // tom escuro do accent
    // status
    success: string
    danger: string
    warning: string
    info: string
    // chart palette (alinhada com template Tempo)
    chartPrimary: string
    chartSecondary: string
    chartTertiary: string
    chartQuaternary: string
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

// Tema dark (default). Alinhado com o template Tempo (julho/2026):
// - accent #8b5cf6 (era #a855f7) - mais clean, combina melhor com o template
// - success/danger/warning alinhados pros tons usados no template
// - chart palette adicionada pros gráficos do módulo Finance
export const DARK: Theme = {
  name: 'dark',
  colors: {
    bg: '#0a0a0b',
    bgSubtle: '#0c0c0e',
    bgCard: '#141416',
    bgHover: '#161619',
    border: '#1f1f22',
    borderStrong: '#2a2a2e',
    text: '#e8e8ea',
    textMuted: '#86868d',
    textSubtle: '#5e5e6e',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    accentSoft: 'rgba(139, 92, 246, 0.12)',
    accentLight: '#a78bfa',
    accentDark: '#6d4ee0',
    success: '#4ade80',
    danger: '#f87171',
    warning: '#facc15',
    info: '#22d3ee',
    chartPrimary: '#8b5cf6',
    chartSecondary: '#a78bfa',
    chartTertiary: '#6d4ee0',
    chartQuaternary: '#4f4193',
    scrim: 'rgba(0, 0, 0, 0.6)'
  },
  radii: {
    sm: '6px',
    md: '9px',
    lg: '12px',
    xl: '14px'
  },
  spacing: {
    sidebarWidth: '260px',
    topbarHeight: '56px'
  },
  font: {
    sans: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace'
  },
  shadow: {
    card: '0 1px 0 0 rgba(255, 255, 255, 0.02) inset, 0 0 0 1px rgba(255, 255, 255, 0.04)',
    pop: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)'
  }
}

// Tema light — alinhado com a mesma paleta, em tons claros.
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
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    accentSoft: 'rgba(124, 58, 237, 0.10)',
    accentLight: '#a78bfa',
    accentDark: '#5b21b6',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#d97706',
    info: '#0891b2',
    chartPrimary: '#7c3aed',
    chartSecondary: '#a78bfa',
    chartTertiary: '#5b21b6',
    chartQuaternary: '#4c1d95',
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