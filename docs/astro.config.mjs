import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
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
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Core Concepts', slug: 'getting-started/concepts' },
          ],
        },
        {
          label: 'Guides',
          items: [
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
            { label: 'Components', slug: 'api/components' },
            { label: 'Annotator', slug: 'api/annotator' },
            { label: 'Types', slug: 'api/types' },
            {
              label: 'Hooks',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'api/hooks' },
                { label: 'useAnnotator', slug: 'api/hooks/use-annotator' },
                { label: 'useAnnotations', slug: 'api/hooks/use-annotations' },
                { label: 'useSelection', slug: 'api/hooks/use-selection' },
                { label: 'useTool', slug: 'api/hooks/use-tool' },
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
