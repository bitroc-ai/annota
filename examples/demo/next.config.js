const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),

  // Transpile annota source files for hot reload during development
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      annota: path.resolve(__dirname, '../../src/index.ts'),
    };
    return config;
  },
};

module.exports = nextConfig;
