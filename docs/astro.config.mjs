import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://annota.dev',
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
        { icon: 'github', label: 'GitHub', href: 'https://github.com/bitroc-ai/annota' },
      ],
      editLink: {
        baseUrl: 'https://github.com/bitroc-ai/annota/edit/main/docs/',
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
            { label: 'Migrating to 1.0', slug: 'guides/migration-1-0' },
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
          ]
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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/src/core/')) return 'annota-core';
            if (id.includes('/src/loaders/') || id.includes('/src/ml/')) return 'annota-loaders';
            if (id.includes('/src/tools/')) return 'annota-tools';
            if (id.includes('/src/rendering/') || id.includes('/pixi.js/')) return 'annota-rendering';
            if (id.includes('/polygon-clipping/')) return 'geometry-vendor';
            if (id.includes('/openseadragon/')) return 'viewer-vendor';
          },
        },
      },
    },
    ssr: {
      noExternal: ['annota', 'openseadragon'],
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
      alias: [
        { find: /^annota\/react$/, replacement: path.resolve(__dirname, '../src/react-entry.ts') },
        { find: /^annota\/tools$/, replacement: path.resolve(__dirname, '../src/tools-entry.ts') },
        { find: /^annota\/loaders$/, replacement: path.resolve(__dirname, '../src/loaders-entry.ts') },
        { find: /^annota\/core$/, replacement: path.resolve(__dirname, '../src/core-entry.ts') },
        { find: /^annota$/, replacement: path.resolve(__dirname, '../src/index.ts') },
        { find: '$lib', replacement: path.resolve(__dirname, './src/lib') },
      ],
    },
  },
});
