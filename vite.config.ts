import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { index: resolve(__dirname, 'index.html'), render: resolve(__dirname, 'render.html') },
    },
  },
});
