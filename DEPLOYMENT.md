# Deployment Guide

This is a pnpm workspace monorepo containing:
- `annota` - The main framework package (root directory)
- `annota-docs` - Documentation site (docs directory)

## Important: Railway Configuration

**⚠️ Critical: Set Root Directory to repository root**

In Railway dashboard:
1. Go to your service settings
2. Find "Root Directory" setting
3. Set it to `.` or `/` (the repository root)
4. **DO NOT** set it to `docs` - this will break the workspace

The build process needs access to both:
- Root `package.json` and `pnpm-workspace.yaml`
- The `annota` package to build the framework
- The `docs` package to build the documentation

## Build Process

The build automatically:
1. Installs all workspace dependencies
2. Builds the `annota` framework
3. Builds the `annota-docs` site
4. Serves the static output from `docs/out`

## Alternative: Vercel Deployment

If using Vercel:
1. Set root directory to `docs`
2. Vercel will use the custom `buildCommand` from `vercel.json`

## Alternative: Netlify Deployment

If using Netlify:
1. Set base directory to `docs`
2. Netlify will use commands from `netlify.toml`
