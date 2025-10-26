# Publishing Guide

This guide covers how to publish new versions of Annota to npm with automated changelog generation.

## Quick Start

```bash
# 1. Make your changes to src/
# 2. Update version and create tag
pnpm version patch  # or minor, or major

# 3. Push with tags
git push origin main --follow-tags
```

The GitHub Actions workflow will automatically:
- ✅ Validate that `src/` or `package.json` changed
- ✅ Run type checking and tests
- ✅ Build the package
- ✅ Generate a changelog
- ✅ Publish to npm
- ✅ Create a GitHub release
- ✅ Commit changelog to docs site

## First-Time Setup

### 1. Enable GitHub Actions Write Permissions

1. Go to repository **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **"Read and write permissions"**
4. Click **Save**

```
Settings → Actions → General → Workflow permissions
  ○ Read repository contents and packages permissions
  ● Read and write permissions  ← SELECT THIS
```

### 2. Add NPM Token

#### Create NPM Access Token:
1. Go to [npmjs.com](https://www.npmjs.com/) → **Access Tokens**
2. Click **Generate New Token** → **Classic Token**
3. Choose **Automation** (for CI/CD)
4. Copy the token (starts with `npm_...`)

#### Add to GitHub Secrets:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: Paste your npm token
5. Click **Add secret**

### 3. Verify Setup

```bash
git tag v0.2.1
git push origin v0.2.1
```

Monitor the workflow at: https://github.com/bitroc-ai/annota/actions

---

## How the Publish Workflow Works

### Trigger Conditions

The workflow triggers when you push a version tag:
```bash
git tag v0.2.1
git push origin v0.2.1
```

### Smart Publishing

**Only publishes when framework code changes**:
- Checks if `src/` or `package.json` changed since the last tag
- If only docs changed, workflow skips publishing (with a warning)
- Prevents unnecessary npm versions for documentation-only updates

### Workflow Steps

1. **Checkout & Validate**
   - Fetches full git history
   - Checks for changes in `src/` or `package.json`
   - Stops if no framework changes detected

2. **Quality Checks**
   - Runs `pnpm typecheck`
   - Runs `pnpm test run`
   - Fails if either check fails

3. **Build**
   - Runs `pnpm build`
   - Generates dist files

4. **Generate Changelog**
   - Extracts commits since last tag that touched `src/` or `package.json`
   - Creates `docs/content/changelog/v{version}.mdx`
   - Includes commit messages, hashes, and installation instructions

5. **Publish**
   - Publishes to npm registry
   - Creates GitHub release with changelog
   - Commits changelog file back to main branch

### Changelog Format

Generated changelogs include:
```mdx
---
title: v0.2.1
description: Release notes for Annota v0.2.1
date: 2025-10-26
---

# v0.2.1

Released on 2025-10-26

## Changes

- feat: add polygon vertex editing (abc123)
- fix: layer visibility toggle (def456)

## Installation

\`\`\`bash
npm install annota@0.2.1
\`\`\`
```

---

## Publishing Methods

### Option 1: Automated (Recommended)

```bash
# Updates package.json and creates git tag
pnpm version patch  # 0.2.0 → 0.2.1
pnpm version minor  # 0.2.0 → 0.3.0
pnpm version major  # 0.2.0 → 1.0.0

# Push with tags
git push origin main --follow-tags
```

### Option 2: Manual Tag

```bash
# 1. Update package.json version manually
# 2. Create tag
git tag v0.2.1

# 3. Push tag
git push origin v0.2.1
```

### Option 3: Manual Workflow Dispatch

Trigger manually from GitHub Actions tab if needed.

---

## Troubleshooting

### ⚠️ "No changes in src/ or package.json"

**What it means**: The tag was created but no framework code changed.

**Solution**:
- This is expected for docs-only changes
- Documentation updates don't need new npm versions
- Only create tags when `src/` actually changes

### ❌ NPM Publish Authentication Error

**Error**: `npm ERR! code E401` or `npm ERR! need auth`

**Solutions**:
- Verify `NPM_TOKEN` secret exists and is correct
- Check token has "Automation" or "Publish" permissions
- Ensure token hasn't expired
- Regenerate token if needed

### ❌ Permission Errors

**Error**: `refusing to allow a GitHub App to create or update workflow`

**Solution**: Enable "Read and write permissions" (see Setup step 1)

### ❌ Tests or Type Check Failing

The workflow will fail if quality checks don't pass:
```bash
# Run locally first to catch issues
pnpm typecheck
pnpm test run
```

Fix all errors before tagging a release.

---

## Quick Reference

| Action                  | Command                          |
|-------------------------|----------------------------------|
| Patch release (0.2.0 → 0.2.1) | `pnpm version patch`    |
| Minor release (0.2.0 → 0.3.0) | `pnpm version minor`    |
| Major release (0.2.0 → 1.0.0) | `pnpm version major`    |
| Push with tags          | `git push origin main --follow-tags` |
| View workflow runs      | https://github.com/bitroc-ai/annota/actions |
| View published package  | https://www.npmjs.com/package/annota |
| View changelogs         | Docs site: `/changelog/v{version}` |

---

## Files Generated

Each publish creates:
- 📦 npm package at https://www.npmjs.com/package/annota
- 📝 `docs/content/changelog/v{version}.mdx` (committed to repo)
- 🏷️ GitHub release at https://github.com/bitroc-ai/annota/releases
- 🌐 Changelog page at docs site `/changelog/v{version}`

---

**Note**: The setup steps are one-time only. Once configured, all future releases work automatically by just pushing tags.
