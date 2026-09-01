import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nameverse.site',

  output: 'static',

  trailingSlash: 'never',

  build: { format: 'file' },

  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => {
        const p = new URL(page).pathname.replace(/\/$/, '') || '/';
        if (p === '/homepage') return false;
        return true;
      },
      entryLimit: 5000,
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date('2026-08-15'),
    }),
  ],

  vite: {
    build: {
      rollupOptions: {
        maxParallelFileOps: 200,
      },
    },
    optimizeDeps: {
      // Only scan source files, not the 42K+ static data files
      entries: ['src/**/*.astro', 'src/**/*.mjs', 'src/**/*.ts', 'src/**/*.js'],
    },
    server: {
      fs: {
        allow: ['..'],
        deny: ['**/node_modules/**', '**/dist/**'],
      },
      watch: {
        // Ignore the 42K+ static name data files — they don't change during dev
        ignored: (path) => {
          const normalized = path.replace(/\\/g, '/');
          return (
            normalized.includes('/public/names/') ||
            normalized.includes('/public/data/') ||
            normalized.includes('/names-manifest.json')
          );
        },
      },
    },
  },

  clearScreen: false,
});