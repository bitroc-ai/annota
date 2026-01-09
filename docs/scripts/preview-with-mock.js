#!/usr/bin/env node
// Wrapper script to run astro preview with openseadragon mock
// Note: This file uses .js extension but CommonJS syntax for Node.js compatibility

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the absolute path to the mock file
const mockPath = resolve(__dirname, '../src/lib/mocks/setup-openseadragon-mock.cjs');

// Set NODE_OPTIONS to preload the mock in the child process
// This ensures the mock is loaded before any openseadragon requires
const env = {
  ...process.env,
  NODE_OPTIONS: `--require ${mockPath}${process.env.NODE_OPTIONS ? ' ' + process.env.NODE_OPTIONS : ''}`,
};

// Now run astro preview with the mock preloaded
const astro = spawn('astro', ['preview'], {
  stdio: 'inherit',
  shell: true,
  env,
});

astro.on('close', (code) => {
  process.exit(code);
});
