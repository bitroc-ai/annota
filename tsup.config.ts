import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core-entry.ts',
    react: 'src/react-entry.ts',
    'legacy-react': 'src/legacy-react-entry.ts',
    tools: 'src/tools-entry.ts',
    loaders: 'src/loaders-entry.ts',
    styles: 'src/styles-entry.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  // rbush is ESM-only; bundling it avoids a broken default interop wrapper in
  // the CommonJS artifacts while preserving identical ESM/CJS behavior.
  noExternal: ['rbush'],
  external: ['react', 'react-dom', 'react/jsx-runtime', 'svelte', 'openseadragon'],
});
