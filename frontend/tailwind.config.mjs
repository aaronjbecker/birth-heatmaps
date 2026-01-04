/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Background colors
        bg: {
          DEFAULT: '#fafafa',
          alt: '#ffffff',
          elevated: '#ffffff',
        },
        // Text colors
        text: {
          DEFAULT: '#1a1a1a',
          muted: '#666666',
        },
        // Border colors
        border: {
          DEFAULT: '#e5e5e5',
          light: '#f0f0f0',
        },
        // Primary brand colors
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
        },
        // Component-specific colors
        card: {
          bg: '#ffffff',
          border: '#e5e5e5',
        },
        tooltip: {
          bg: 'rgba(255, 255, 255, 0.98)',
          border: '#cccccc',
        },
        shadow: 'rgba(0, 0, 0, 0.1)',
        // SVG/D3 visualization colors
        svg: {
          text: '#333333',
          axis: '#666666',
          grid: '#e0e0e0',
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

