/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,js,mjs,ts,css}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        nv: {
          page: 'rgb(var(--nv-page) / <alpha-value>)',
          surface: 'rgb(var(--nv-surface) / <alpha-value>)',
          'surface-subtle': 'rgb(var(--nv-subtle) / <alpha-value>)',
          subtle: 'rgb(var(--nv-subtle) / <alpha-value>)',
          border: 'rgb(var(--nv-line) / <alpha-value>)',
          line: 'rgb(var(--nv-line) / <alpha-value>)',
          text: {
            DEFAULT: 'rgb(var(--nv-text) / <alpha-value>)',
            secondary: 'rgb(var(--nv-secondary) / <alpha-value>)',
            muted: 'rgb(var(--nv-muted) / <alpha-value>)',
          },
          primary: {
            DEFAULT: 'rgb(var(--nv-primary) / <alpha-value>)',
            hover: 'rgb(var(--nv-primary-hover) / <alpha-value>)',
          },
          accent: {
            DEFAULT: 'rgb(var(--nv-accent) / <alpha-value>)',
            hover: 'rgb(var(--nv-accent-hover) / <alpha-value>)',
            subtle: 'rgb(var(--nv-accent-subtle) / <alpha-value>)',
          },
          success: 'rgb(var(--nv-success) / <alpha-value>)',
          warning: 'rgb(var(--nv-warning) / <alpha-value>)',
          error: 'rgb(var(--nv-error) / <alpha-value>)',
        },
        islamic: {
          DEFAULT: 'rgb(var(--rl-islamic) / <alpha-value>)',
          soft: 'rgb(var(--rl-islamic-soft) / <alpha-value>)',
        },
        christian: {
          DEFAULT: 'rgb(var(--rl-christian) / <alpha-value>)',
          soft: 'rgb(var(--rl-christian-soft) / <alpha-value>)',
        },
        hindu: {
          DEFAULT: 'rgb(var(--rl-hindu) / <alpha-value>)',
          soft: 'rgb(var(--rl-hindu-soft) / <alpha-value>)',
        },
        italian: {
          DEFAULT: 'rgb(var(--rl-italian) / <alpha-value>)',
          soft: 'rgb(var(--rl-italian-soft) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 12px 32px -8px rgb(0 0 0 / 0.12)',
      },
      maxWidth: {
        page: '72rem',
      },
    },
  },
  plugins: [],
};
