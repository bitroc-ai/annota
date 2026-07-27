import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser'],
    alias: {
      annota: resolve(__dirname, 'src/index.ts'),
    },
  },
  test: {
    watch: false,
    environment: 'jsdom',
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
