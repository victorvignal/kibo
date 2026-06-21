/**
 * @type {import('tailwindcss').Config}
 *
 * IMPORTANTE: os valores aqui DEVEM bater com src/renderer/src/design/tokens.ts.
 * Tailwind não importa TS direto em runtime, então duplicamos. Mudou um tema,
 * mudou os dois arquivos (e o fallback em index.css).
 *
 * Pra criar tema novo: muda o tokens.ts, atualiza aqui, atualiza o :root no index.css.
 * Ou troca pra uma config Tailwind que consome o TS via plugin (próximo passo se
 * virar bagunça).
 */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--color-bg)',
          subtle: 'var(--color-bg-subtle)',
          card: 'var(--color-bg-card)',
          hover: 'var(--color-bg-hover)'
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)'
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)'
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          soft: 'var(--color-accent-soft)'
        },
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)'
      },
      width: {
        sidebar: 'var(--sidebar-width)'
      },
      height: {
        topbar: 'var(--topbar-height)'
      }
    }
  },
  plugins: []
}