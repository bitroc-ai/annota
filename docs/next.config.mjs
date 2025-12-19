import nextra from 'nextra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextra = nextra({
  defaultShowCopyCode: true,
  contentDirBasePath: '/',
  search: {
    codeblocks: false,
  },
});

export default withNextra({
  devIndicators: false,
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['nextra-theme-docs'],
  },
});
