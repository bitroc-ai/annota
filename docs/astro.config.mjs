import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Annota',
      description: 'High-performance annotation framework for whole slide imaging and digital pathology',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/anthropics/annota' },
      ],
      editLink: {
        baseUrl: 'https://github.com/anthropics/annota/edit/main/docs/',
      },
      components: {
        Header: './src/components/header.astro',
      },
      customCss: [
        './src/styles/custom.css',
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Framework Selection', slug: 'framework-selection' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'React Quick Start', slug: 'getting-started/quick-start/react' },
            { label: 'Svelte Quick Start', slug: 'getting-started/quick-start/svelte' },
            { label: 'Core Concepts', slug: 'getting-started/concepts' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Framework Comparison', slug: 'guides/framework-comparison' },
            { label: 'Annotation Tools', slug: 'guides/tools' },
            { label: 'Layer System', slug: 'guides/layers' },
            { label: 'Events', slug: 'guides/events' },
            { label: 'Data Loaders', slug: 'guides/loaders' },
            { label: 'Styling', slug: 'guides/styling' },
            { label: 'Context Menu', slug: 'guides/context-menu' },
            { label: 'Popups', slug: 'guides/popups' },
            { label: 'Undo/Redo', slug: 'guides/undo-redo' },
            { label: 'Vertex Editing', slug: 'guides/vertex-editing' },
            { label: 'SAM Tool', slug: 'guides/sam-tool' },
            { label: 'Integration', slug: 'guides/integration' },
          ],
        },
        {
          label: 'Use Cases',
          items: [
            { label: 'Basic Viewer', slug: 'use-cases/basic-viewer' },
            { label: 'Layer Management', slug: 'use-cases/layer-management' },
            { label: 'Event Handling', slug: 'use-cases/event-handling' },
            { label: 'Custom Styling', slug: 'use-cases/custom-styling' },
            { label: 'H5 Loading', slug: 'use-cases/h5-loading' },
            { label: 'Image Overlays', slug: 'use-cases/image-overlays' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Overview', slug: 'api' },
            { label: 'Annotator', slug: 'api/annotator' },
            { label: 'Types', slug: 'api/types' },
            {
              label: 'React API',
              collapsed: true,
              items: [
                { label: 'React Overview', slug: 'api/react' },
                { label: 'React Hooks', slug: 'api/react/hooks' },
                { label: 'React Components', slug: 'api/react/components' },
              ],
            },
            {
              label: 'Svelte API',
              collapsed: true,
              items: [
                { label: 'Svelte Overview', slug: 'api/svelte' },
                { label: 'Svelte Stores', slug: 'api/svelte/stores' },
                { label: 'Svelte Components', slug: 'api/svelte/components' },
              ],
            },
          ],
        },
        {
          label: 'Resources',
          items: [
            { label: 'Architecture', slug: 'architecture' },
            { label: 'Changelog', slug: 'changelog' },
          ],
        },
        {
          label: 'Playground',
          link: '/playground',
        },
      ],
    }),
    svelte(),
    react(),
  ],
  output: 'static',
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 6006,
    host: true, // Bind to 0.0.0.0 (all interfaces) for Railway
    strictPort: false, // Allow Railway to assign port dynamically
  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 6006,
    host: true, // Bind to 0.0.0.0 (all interfaces) for Railway
    strictPort: false, // Allow Railway to assign port dynamically
  },
  vite: {
    optimizeDeps: {
      exclude: ['openseadragon'], // Don't pre-bundle openseadragon
    },
    ssr: {
      noExternal: ['annota', 'lucide-svelte'],
    },
    plugins: [
      {
        name: 'mock-openseadragon-ssr',
        enforce: 'pre',
        resolveId(id, importer) {
          // Only intercept exact 'openseadragon' imports, not type imports or subpaths
          if (id === 'openseadragon' || id === 'openseadragon?commonjs-external') {
            return '\0mock-openseadragon';
          }
          return null;
        },
        load(id) {
          if (id === '\0mock-openseadragon') {
            return `
              export default {
                Viewer: class Viewer {
                  constructor() {}
                  addHandler() {}
                  removeHandler() {}
                  open() {}
                  close() {}
                },
                Point: class Point {
                  constructor(x, y) {
                    this.x = x ?? 0;
                    this.y = y ?? 0;
                  }
                }
              };
            `;
          }
          return null;
        },
      },
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
