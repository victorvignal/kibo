import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED",
          light: "#A78BFA",
          dark: "#5B21B6",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1F2937",
          light: "#374151",
          foreground: "#F9FAFB",
        },
        accent: {
          DEFAULT: "#F59E0B",
          light: "#FCD34D",
          dark: "#D97706",
        },
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        success: "#059669",
        warning: "#D97706",
        background: "#FAFAFA",
        foreground: "#111827",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
        border: "#E5E7EB",
        ring: "#7C3AED",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
      },
      boxShadow: {
        soft: "0 2px 15px rgba(0, 0, 0, 0.08)",
        "soft-lg": "0 4px 30px rgba(0, 0, 0, 0.12)",
        glow: "0 0 20px rgba(124, 58, 237, 0.25)",
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.6s ease-out forwards",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
