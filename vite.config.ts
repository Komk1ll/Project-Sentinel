import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@game': new URL('./src/game', import.meta.url).pathname,
      '@content': new URL('./src/content', import.meta.url).pathname,
      '@ui': new URL('./src/ui', import.meta.url).pathname,
      '@types': new URL('./src/types', import.meta.url).pathname,
      '@utils': new URL('./src/utils', import.meta.url).pathname,
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
  // @ts-expect-error vitest config
  test: {
    globals: true,
    environment: 'node',
  },
});
