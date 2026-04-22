import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    environment: 'jsdom',
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
