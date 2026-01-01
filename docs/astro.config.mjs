import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx({
      syntaxHighlight: 'shiki',
      shikiConfig: {
        theme: 'github-dark',
        wrap: true,
      },
      optimize: true,
    }),
    svelte(),
    react(),
  ],
  output: 'static',
  server: {
    port: 6006,
    strictPort: true,
  },
  vite: {
    ssr: {
      noExternal: ['annota', 'lucide-svelte', 'openseadragon'],
    },
    plugins: [
      {
        name: 'mock-openseadragon',
        enforce: 'pre',
        resolveId(id, importer, options) {
          if (id === 'openseadragon') {
            if (options?.ssr) {
              return 'virtual:openseadragon';
            }
          }
          return null;
        },
        load(id) {
          if (id === 'virtual:openseadragon') {
            return 'export default {};';
          }
        }
      },
      tailwindcss(),
    ],
    resolve: {
      alias: {
        'annota/svelte': path.resolve(__dirname, '../src/svelte/index.ts'),
        'annota': path.resolve(__dirname, '../dist/index.mjs'),
        '$lib': path.resolve(__dirname, './src/lib'),
      },
    },
  },
});
