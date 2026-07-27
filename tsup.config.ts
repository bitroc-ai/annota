import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core-entry.ts',
    react: 'src/react-entry.ts',
    tools: 'src/tools-entry.ts',
    loaders: 'src/loaders-entry.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'svelte', 'openseadragon'],
});
