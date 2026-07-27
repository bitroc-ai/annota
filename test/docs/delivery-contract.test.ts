import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('documentation delivery contract', () => {
  it('validates the final generated changelog before commit and publish', async () => {
    const workflow = await readFile('.github/workflows/publish.yml', 'utf8');
    const generate = workflow.indexOf('name: Generate changelog');
    const imports = workflow.indexOf('name: Validate final documentation imports');
    const docsBuild = workflow.indexOf('name: Build documentation with final changelog');
    const commit = workflow.indexOf('name: Commit changelog to docs');
    const publish = workflow.indexOf('name: Publish to npm');

    expect(generate).toBeGreaterThan(-1);
    expect(imports).toBeGreaterThan(generate);
    expect(docsBuild).toBeGreaterThan(imports);
    expect(commit).toBeGreaterThan(docsBuild);
    expect(publish).toBeGreaterThan(docsBuild);
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
});
