/**
 * Tailwind CSS Configuration
 *
 * THEMING MECHANISM:
 * ------------------
 * This project uses a CSS custom properties (CSS variables) approach for theming,
 * which allows instant theme switching without CSS transitions.
 *
 * How it works:
 * 1. CSS variables are defined in global.css for both light and dark themes
 * 2. Tailwind colors reference these CSS variables (e.g., 'var(--color-bg)')
 * 3. When data-theme attribute changes, CSS variables update automatically
 * 4. NO dark: prefixes needed - colors automatically adapt to the current theme
 *
 * Example:
 *   <div class="bg-bg text-text">  <!-- ✅ Correct - adapts automatically -->
 *   <div class="bg-bg dark:bg-bg"> <!-- ❌ Redundant - don't use dark: for themed colors -->
 *
 * The darkMode config tells Tailwind to use [data-theme="dark"] selector for any
 * remaining dark: variants (e.g., dark:bg-green-600 for Tailwind's default colors).
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Background colors - reference CSS custom properties defined in global.css
        // These automatically update when data-theme attribute changes
        bg: {
          DEFAULT: 'var(--color-bg)',
          alt: 'var(--color-bg-alt)',
          elevated: 'var(--color-bg-elevated)',
        },
        // Text colors
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        // Border colors
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
        },
        // Primary brand colors
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        // Component-specific colors
        card: {
          bg: 'var(--color-card-bg)',
          border: 'var(--color-card-border)',
        },
        tooltip: {
          bg: 'var(--color-tooltip-bg)',
          border: 'var(--color-tooltip-border)',
        },
        shadow: 'var(--color-shadow)',
        // SVG/D3 visualization colors
        svg: {
          text: 'var(--color-svg-text)',
          axis: 'var(--color-svg-axis)',
          grid: 'var(--color-svg-grid)',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
      },
      maxWidth: {
        container: '1200px',
      },
      height: {
        header: '60px',
      },
    },
  },
  plugins: [],
};

