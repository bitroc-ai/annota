import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'annota-consumer-'));

function run(command, args, cwd = projectRoot) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

try {
  const packDirectory = join(temporaryRoot, 'pack');
  run('mkdir', ['-p', packDirectory]);
  run('pnpm', ['pack', '--pack-destination', packDirectory]);
  const tarball = join(
    packDirectory,
    readdirSync(packDirectory).find(file => file.endsWith('.tgz'))
  );
  const consumer = join(temporaryRoot, 'consumer');
  run('mkdir', ['-p', consumer]);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      annota: `file:${tarball}`,
      openseadragon: '^6.0.0',
      react: '^19.2.0',
      'react-dom': '^19.2.0',
      svelte: '^5.55.0',
      vite: '^8.0.0',
      typescript: '^6.0.0',
      '@sveltejs/vite-plugin-svelte': '^7.0.0',
    },
  }, null, 2));
  run('pnpm', ['install', '--frozen-lockfile=false', '--prefer-offline'], consumer);

  writeFileSync(join(consumer, 'esm.mjs'), `
    import.meta.resolve('annota');
    import.meta.resolve('annota/react');
    import.meta.resolve('annota/core');
    import.meta.resolve('annota/tools');
    import.meta.resolve('annota/loaders');
    import.meta.resolve('annota/svelte');
    import.meta.resolve('annota/styles.css');
  `);
  writeFileSync(join(consumer, 'cjs.cjs'), `
    require.resolve('annota');
    require.resolve('annota/react');
    require.resolve('annota/core');
    require.resolve('annota/tools');
    require.resolve('annota/loaders');
  `);
  writeFileSync(join(consumer, 'index.html'), '<div id="app"></div><script type="module" src="/entry.js"></script>');
  writeFileSync(join(consumer, 'entry.js'), `
    import 'annota';
    import 'annota/react';
    import 'annota/core';
    import 'annota/tools';
    import 'annota/loaders';
    import 'annota/svelte';
    import 'annota/styles.css';
  `);
  writeFileSync(join(consumer, 'vite.config.mjs'), `
    import { defineConfig } from 'vite';
    import { svelte } from '@sveltejs/vite-plugin-svelte';
    export default defineConfig({ plugins: [svelte()] });
  `);
  writeFileSync(join(consumer, 'consumer.ts'), `
    import type { AnnotationInput } from 'annota';
    import { createAnnotationStore } from 'annota/core';
    import { PointTool } from 'annota/tools';
    import { decodeRgb16Pixel } from 'annota/loaders';
    import type { AnnotatorProps } from 'annota/react';
    import { Annotator as SvelteAnnotator } from 'annota/svelte';
    const input: AnnotationInput = {
      id: 'consumer',
      shape: { type: 'point', point: { x: 1, y: 2 } },
    };
    createAnnotationStore().add(input);
    void PointTool;
    void decodeRgb16Pixel;
    const props: AnnotatorProps | undefined = undefined;
    void props;
    void SvelteAnnotator;
  `);
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      skipLibCheck: true,
    },
    include: ['consumer.ts'],
  }, null, 2));
  run('node', ['esm.mjs'], consumer);
  run('node', ['cjs.cjs'], consumer);
  run('pnpm', ['exec', 'tsc', '--noEmit'], consumer);
  run('pnpm', ['exec', 'vite', 'build'], consumer);

  const packageJson = JSON.parse(
    readFileSync(join(consumer, 'node_modules/annota/package.json'), 'utf8')
  );
  for (const path of ['.', './core', './react', './svelte', './tools', './loaders', './styles.css']) {
    if (!packageJson.exports[path]) throw new Error(`Missing package export ${path}`);
  }
  if (!existsSync(join(consumer, 'node_modules/annota/dist/index.css'))) {
    throw new Error('Stable CSS export does not exist');
  }

  const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
  for (const forbidden of ['node_modules/', '.svelte-kit/', 'docs/dist/', 'docs/.astro/', 'test/']) {
    if (listing.includes(forbidden)) throw new Error(`Tarball contains forbidden path ${forbidden}`);
  }
  console.log('Packed ESM/CJS/React/Svelte/tools/loaders/CSS consumers passed.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
