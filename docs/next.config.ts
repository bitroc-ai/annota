import nextra from "nextra";

const withNextra = nextra({
  defaultShowCopyCode: true,
  contentDirBasePath: "/",
  search: {
    codeblocks: false,
  },
});

export default withNextra({
  devIndicators: false,
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  outputFileTracingRoot: require("path").join(__dirname, ".."),
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["nextra-theme-docs"],
  },
});
