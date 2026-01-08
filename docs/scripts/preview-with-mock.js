#!/usr/bin/env node
// Wrapper script to run astro preview with openseadragon mock
// Note: This file uses .js extension but CommonJS syntax for Node.js compatibility

// Load the mock before anything else
// Use createRequire for ES module compatibility
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load the mock
require(join(__dirname, '../src/lib/mocks/setup-openseadragon-mock.js'));

// Now run astro preview
const astro = spawn('astro', ['preview'], {
  stdio: 'inherit',
  shell: true,
});

astro.on('close', (code) => {
  process.exit(code);
});
