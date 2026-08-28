import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nameverse.site',

  output: 'static',

  trailingSlash: 'never',

  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => {
        if (page === '/') return true;
        if (page.startsWith('/names/') && !page.includes('/letter/') && !page.includes('//')) return true;
        if (page.startsWith('/blog/')) return true;
        if (['/about', '/advanced-search', '/contact', '/name-meanings', '/names-by-meaning', '/names-by-origin', '/popularity', '/my-names'].includes(page)) return true;
        return false;
      },
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