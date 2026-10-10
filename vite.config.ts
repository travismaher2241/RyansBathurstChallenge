import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    emptyOutDir: false,
    assetsInlineLimit: 0,
  },
  server: {
    port: 3000,
  }
});
