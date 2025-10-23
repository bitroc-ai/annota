import nextra from 'nextra';

const withNextra = nextra({
  defaultShowCopyCode: true,
  contentDirBasePath: "/",
  search: {
    codeblocks: false,
  },
});

export default withNextra({
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['nextra-theme-docs'],
  },
});
