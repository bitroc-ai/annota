import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'annota-consumers-'));

function run(command, args, cwd = projectRoot) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function createFixture(name, tarball, dependencies, files) {
  const directory = join(temporaryRoot, name);
  run('mkdir', ['-p', directory]);
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      annota: `file:${tarball}`,
      openseadragon: '^6.0.0',
      vite: '^8.0.0',
      typescript: '^6.0.0',
      ...dependencies,
    },
  }, null, 2));
  Object.entries(files).forEach(([file, content]) => writeFileSync(join(directory, file), content));
  run('pnpm', ['install', '--frozen-lockfile=false', '--prefer-offline'], directory);
  return directory;
}

function verifyPackageShape(consumer, tarball) {
  const packageJson = JSON.parse(
    readFileSync(join(consumer, 'node_modules/annota/package.json'), 'utf8')
  );
  for (const path of [
    '.', './core', './react', './legacy-react', './svelte', './tools', './loaders', './styles.css',
  ]) {
    if (!packageJson.exports[path]) throw new Error(`Missing package export ${path}`);
  }
  if (!existsSync(join(consumer, 'node_modules/annota/dist/styles.css'))) {
    throw new Error('Stable CSS export does not exist');
  }
  const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
  for (const forbidden of ['node_modules/', '.svelte-kit/', 'docs/dist/', 'docs/.astro/', 'test/']) {
    if (listing.includes(forbidden)) throw new Error(`Tarball contains forbidden path ${forbidden}`);
  }
}

const html = '<div id="app"></div><script type="module" src="/entry.js"></script>';
const tsconfig = JSON.stringify({
  compilerOptions: {
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    strict: true,
    skipLibCheck: true,
  },
  include: ['consumer.ts'],
}, null, 2);

try {
  const packDirectory = join(temporaryRoot, 'pack');
  run('mkdir', ['-p', packDirectory]);
  run('pnpm', ['pack', '--pack-destination', packDirectory]);
  const tarball = join(
    packDirectory,
    readdirSync(packDirectory).find(file => file.endsWith('.tgz'))
  );

  const root = createFixture('root-only', tarball, { jsdom: '^29.0.0' }, {
    'index.html': html,
    'entry.js': `
      import { createAnnotator, createAnnotationStore } from 'annota';
      if (typeof createAnnotator !== 'function') throw new Error('missing createAnnotator');
      createAnnotationStore();
    `,
    'esm.mjs': `
      import { JSDOM } from 'jsdom';
      const dom = new JSDOM('<!doctype html><html><body></body></html>');
      for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement', 'Image']) {
        Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      }
      HTMLCanvasElement.prototype.getContext = () => null;
      const { createAnnotator, createAnnotationStore } = await import('annota');
      if (typeof createAnnotator !== 'function') throw new Error('ESM root failed to load');
      createAnnotationStore();
    `,
    'cjs.cjs': `
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM('<!doctype html><html><body></body></html>');
      for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement', 'Image']) {
        Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      }
      HTMLCanvasElement.prototype.getContext = () => null;
      const api = require('annota');
      if (typeof api.createAnnotator !== 'function') throw new Error('CJS root failed to load');
      api.createAnnotationStore();
    `,
    'consumer.ts': `
      import { createAnnotator, type AnnotationInput } from 'annota';
      const input: AnnotationInput = { id: 'root', shape: { type: 'point', point: { x: 1, y: 2 } } };
      void createAnnotator;
      void input;
    `,
    'tsconfig.json': tsconfig,
  });
  run('node', ['esm.mjs'], root);
  run('node', ['cjs.cjs'], root);
  run('pnpm', ['exec', 'tsc', '--noEmit'], root);
  run('pnpm', ['exec', 'vite', 'build'], root);
  verifyPackageShape(root, tarball);

  const react = createFixture('react-only', tarball, {
    react: '^19.2.0',
    'react-dom': '^19.2.0',
    jsdom: '^29.0.0',
  }, {
    'index.html': html,
    'entry.js': `
      import { Annotator } from 'annota/react';
      if (typeof Annotator !== 'function') throw new Error('React entry failed to load');
    `,
    'esm.mjs': `
      import { JSDOM } from 'jsdom';
      const dom = new JSDOM('<!doctype html><html><body></body></html>');
      for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement', 'Image']) {
        Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      }
      HTMLCanvasElement.prototype.getContext = () => null;
      const { Annotator } = await import('annota/react');
      if (typeof Annotator !== 'function') throw new Error('React ESM failed to load');
    `,
    'cjs.cjs': `
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM('<!doctype html><html><body></body></html>');
      for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement', 'Image']) {
        Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      }
      HTMLCanvasElement.prototype.getContext = () => null;
      const api = require('annota/react');
      if (typeof api.Annotator !== 'function') throw new Error('React CJS failed to load');
    `,
    'consumer.ts': `
      import type { AnnotatorProps } from 'annota/react';
      const props: AnnotatorProps | undefined = undefined;
      void props;
    `,
    'tsconfig.json': tsconfig,
  });
  run('node', ['esm.mjs'], react);
  run('node', ['cjs.cjs'], react);
  run('pnpm', ['exec', 'tsc', '--noEmit'], react);
  run('pnpm', ['exec', 'vite', 'build'], react);

  const svelte = createFixture('svelte-only', tarball, {
    svelte: '^5.55.0',
    '@sveltejs/vite-plugin-svelte': '^7.0.0',
  }, {
    'index.html': html,
    'entry.js': `
      import { Annotator } from 'annota/svelte';
      if (!Annotator) throw new Error('Svelte entry failed to load');
    `,
    'vite.config.mjs': `
      import { defineConfig } from 'vite';
      import { svelte } from '@sveltejs/vite-plugin-svelte';
      export default defineConfig({ plugins: [svelte()] });
    `,
    'consumer.ts': `
      import { Annotator } from 'annota/svelte';
      void Annotator;
    `,
    'tsconfig.json': tsconfig,
  });
  run('pnpm', ['exec', 'tsc', '--noEmit'], svelte);
  run('pnpm', ['exec', 'vite', 'build'], svelte);

  const utilities = createFixture('utilities-only', tarball, { jsdom: '^29.0.0' }, {
    'index.html': html,
    'entry.js': `
      import { PointTool } from 'annota/tools';
      import { decodeRgb16Pixel } from 'annota/loaders';
      import { createAnnotationStore } from 'annota/core';
      void PointTool;
      void decodeRgb16Pixel;
      createAnnotationStore();
    `,
    'esm.mjs': `
      import { JSDOM } from 'jsdom';
      const dom = new JSDOM('<!doctype html><html><body></body></html>');
      for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement', 'Image']) {
        Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      }
      HTMLCanvasElement.prototype.getContext = () => null;
      const { PointTool } = await import('annota/tools');
      import { decodeRgb16Pixel } from 'annota/loaders';
      if (!PointTool || !decodeRgb16Pixel) throw new Error('utility ESM failed to load');
    `,
    'cjs.cjs': `
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM('<!doctype html><html><body></body></html>');
      for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement', 'Image']) {
        Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
      }
      HTMLCanvasElement.prototype.getContext = () => null;
      const tools = require('annota/tools');
      const loaders = require('annota/loaders');
      if (!tools.PointTool || !loaders.decodeRgb16Pixel) throw new Error('utility CJS failed to load');
    `,
    'consumer.ts': `
      import { createAnnotationStore } from 'annota/core';
      import { PointTool } from 'annota/tools';
      import { decodeRgb16Pixel } from 'annota/loaders';
      void PointTool;
      void decodeRgb16Pixel;
      createAnnotationStore();
    `,
    'tsconfig.json': tsconfig,
  });
  run('node', ['esm.mjs'], utilities);
  run('node', ['cjs.cjs'], utilities);
  run('pnpm', ['exec', 'tsc', '--noEmit'], utilities);
  run('pnpm', ['exec', 'vite', 'build'], utilities);

  console.log('Isolated root/React/Svelte/tools/loaders packed consumers passed.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
