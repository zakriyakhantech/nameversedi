import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nameverse.site',

  output: 'static',

  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
    }),
  ],

  vite: {
    build: {
      rollupOptions: {
        maxParallelFileOps: 50,
      },
    },
    server: {
      fs: {
        allow: ['..'],
        deny: ['**/node_modules/**', '**/dist/**'],
      },
    },
  },

  clearScreen: false,
});