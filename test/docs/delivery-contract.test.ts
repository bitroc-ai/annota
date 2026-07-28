import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('documentation delivery contract', () => {
  function validateReleaseVersion(candidate: string) {
    return spawnSync(process.execPath, ['scripts/validate-release-version.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        RELEASE_VERSION_CANDIDATE: candidate,
      },
    });
  }

  function validateReleasePackageVersion(candidate: string) {
    return spawnSync(process.execPath, ['scripts/validate-release-package-version.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        RELEASE_VERSION: candidate,
      },
    });
  }

  it('validates the final generated changelog before commit and publish', async () => {
    const workflow = await readFile('.github/workflows/publish.yml', 'utf8');
    const packageVersion = workflow.indexOf('name: Verify package release version');
    const generate = workflow.indexOf('name: Generate changelog');
    const imports = workflow.indexOf('name: Validate final documentation imports');
    const docsBuild = workflow.indexOf('name: Build documentation with final changelog');
    const commit = workflow.indexOf('name: Commit changelog to docs');
    const publish = workflow.indexOf('name: Publish to npm');

    expect(packageVersion).toBeGreaterThan(-1);
    expect(generate).toBeGreaterThan(packageVersion);
    expect(imports).toBeGreaterThan(generate);
    expect(docsBuild).toBeGreaterThan(imports);
    expect(commit).toBeGreaterThan(docsBuild);
    expect(publish).toBeGreaterThan(commit);

    const commitStep = workflow.slice(commit, publish);
    const gitCommit = commitStep.indexOf('git commit ');
    const gitPush = commitStep.indexOf('git push ');
    expect(commitStep).toContain('set -euo pipefail');
    expect(commitStep).toContain('if git diff --quiet -- "$CHANGELOG_FILE"; then');
    expect(gitCommit).toBeGreaterThan(-1);
    expect(gitPush).toBeGreaterThan(gitCommit);
    expect(commitStep).not.toMatch(/git (?:commit|push)[^\n]*\|\|/);
  });

  it('keeps benchmark CI self-building and checks imports in pull-request CI', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    expect(packageJson.scripts['benchmark:ci']).toMatch(/^pnpm build && /);

    const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
    const imports = workflow.indexOf('run: pnpm check:docs-imports');
    const docsBuild = workflow.indexOf('run: pnpm --dir docs build');
    expect(imports).toBeGreaterThan(-1);
    expect(docsBuild).toBeGreaterThan(imports);
  });

  it('passes workflow versions through env and validates them before shell use', async () => {
    const workflow = await readFile('.github/workflows/publish.yml', 'utf8');
    const extractStart = workflow.indexOf('name: Extract version from tag');
    const generateStart = workflow.indexOf('name: Generate changelog');
    const extractStep = workflow.slice(extractStart, generateStart);

    expect(extractStep).toContain('RAW_DISPATCH_VERSION: ${{ github.event.inputs.version }}');
    expect(extractStep).toContain('RELEASE_VERSION_CANDIDATE');
    expect(extractStep).toContain('node scripts/validate-release-version.mjs');
    expect(extractStep).not.toMatch(/run:[\s\S]*\$\{\{\s*github\.event\.inputs\.version\s*\}\}/);

    for (const version of ['1.2.3', '0.0.0', '2.0.0-rc.1', '1.2.3-alpha-beta.7']) {
      const result = validateReleaseVersion(version);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe(version);
    }

    for (const version of [
      '1.2',
      '01.2.3',
      '1.2.3-01',
      '1.2.3+build.1',
      '1.2.3 ',
      '1.2.3"; printf WORKFLOW_INPUT_INJECTION; #',
    ]) {
      const result = validateReleaseVersion(version);
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain('WORKFLOW_INPUT_INJECTION');
    }
  });

  it('requires the release version to match package.json before changelog generation', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    const matching = validateReleasePackageVersion(packageJson.version);
    expect(matching.status, matching.stderr).toBe(0);
    expect(matching.stdout).toBe(packageJson.version);

    const mismatch = validateReleasePackageVersion('9.9.9');
    expect(mismatch.status).toBe(1);
    expect(mismatch.stderr).toContain('does not match package.json version');
  });

  it('preserves valid frontmatter while prepending a generated release', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'annota-changelog-'));
    const changelog = path.join(directory, 'changelog.mdx');
    await writeFile(changelog, `---
title: Changelog
description: Releases
---

# Changelog

## v1.0.0

Previous release.
`);

    try {
      const result = spawnSync(
        process.execPath,
        [
          'scripts/generate-changelog.mjs',
          '--version',
          '1.1.0',
          '--date',
          'July 28, 2026',
          '--file',
          changelog,
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          input: '- fix: validate final changelog (abc1234)\n',
        }
      );
      expect(result.status, result.stderr).toBe(0);

      const generated = await readFile(changelog, 'utf8');
      expect(generated).toMatch(/^---\ntitle: Changelog\ndescription: Releases\n---\n/);
      expect(generated).toContain('## v1.1.0');
      expect(generated).toContain('- fix: validate final changelog (abc1234)');
      expect(generated.indexOf('## v1.1.0')).toBeLessThan(generated.indexOf('## v1.0.0'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('replaces every existing section for the same changelog version', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'annota-changelog-'));
    const changelog = path.join(directory, 'changelog.mdx');
    await writeFile(changelog, `---
title: Changelog
description: Releases
---

# Changelog

## v1.0.0

Stale release.

## v0.10.0

Previous release.

## v1.0.0

Duplicate stale release.
`);

    try {
      const result = spawnSync(
        process.execPath,
        [
          'scripts/generate-changelog.mjs',
          '--version',
          '1.0.0',
          '--date',
          'July 28, 2026',
          '--file',
          changelog,
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          input: '- fix: replacement content (def5678)\n',
        }
      );
      expect(result.status, result.stderr).toBe(0);

      const generated = await readFile(changelog, 'utf8');
      expect(generated.match(/^## v1\.0\.0$/gm)).toHaveLength(1);
      expect(generated).toContain('- fix: replacement content (def5678)');
      expect(generated).not.toContain('Stale release.');
      expect(generated).not.toContain('Duplicate stale release.');
      expect(generated).toContain('## v0.10.0');
      expect(generated).toContain('Previous release.');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
