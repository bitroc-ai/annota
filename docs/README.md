# Annota Documentation

Professional documentation site for the Annota framework, built with Nextra and Next.js 15.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The documentation site will be available at http://localhost:7772

## Structure

```
docs/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with Nextra theme
│   ├── page.tsx           # Homepage
│   └── [...mdxPath]/      # Dynamic MDX routing
├── content/               # Documentation content (MDX files)
│   ├── docs/             # Main documentation
│   │   ├── index.mdx     # Introduction
│   │   ├── getting-started.mdx
│   │   ├── guides/       # Guide articles
│   │   └── examples/     # Code examples
│   └── api/              # API reference
├── public/               # Static assets
└── package.json
```

## Adding Content

### New Documentation Page

Create a new `.mdx` file in `content/docs/`:

```mdx
# Page Title

Your content here...
```

Update the `_meta.js` file to include it in navigation.

### New Guide

Add MDX files to `content/docs/guides/` and update `content/docs/guides/_meta.js`.

### New API Documentation

Add MDX files to `content/api/` and update `content/api/_meta.js`.

## Deployment

Build the static site:

```bash
pnpm build
```

The static files will be generated in the `out/` directory, ready for deployment to any static hosting service (GitHub Pages, Vercel, Netlify, etc.).
