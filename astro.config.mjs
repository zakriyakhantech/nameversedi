import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nameverse.site',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  vite: {
    ssr: {
      noExternal: [],
    },
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
    clearScreen: false,
  },
});