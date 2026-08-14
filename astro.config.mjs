import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://nameverse.site',

  output: 'static',

  integrations: [tailwind()],

  vite: {
    build: {
      rollupOptions: {
        maxParallelFileOps: 50,
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