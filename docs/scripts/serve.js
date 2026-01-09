#!/usr/bin/env node
// Simple wrapper to serve static files with proper PORT handling for Railway

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');
const port = process.env.PORT || '6006';

// Verify dist folder exists
if (!existsSync(distPath)) {
  console.error('Error: dist/ folder not found. Run "pnpm build" first.');
  process.exit(1);
}

console.log(`Starting server on port ${port}...`);
console.log(`Serving files from: ${distPath}`);

// Run serve with the dist directory
// -l 0.0.0.0:PORT binds to all interfaces (required for Railway/Docker)
// No -s flag: this is a static multi-page site, not SPA
const server = spawn('npx', ['serve', distPath, '-l', port], {
  stdio: 'inherit',
  shell: true,
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  process.exit(code || 0);
});
