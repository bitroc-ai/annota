import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function checkDocs(...targets: string[]) {
  return spawnSync(
    process.execPath,
    ['scripts/check-doc-imports.mjs', ...targets],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    }
  );
}

describe('documentation import contract', () => {
  it('accepts canonical imports and the current documentation corpus', () => {
    const fixture = checkDocs('test/fixtures/docs-imports/valid.mdx');
    expect(fixture.status, fixture.stderr).toBe(0);

    const corpus = checkDocs();
    expect(corpus.status, corpus.stderr).toBe(0);
  });

  it('rejects semantic root and non-canonical subpath imports in fenced examples', () => {
    const result = checkDocs('test/fixtures/docs-imports/invalid.mdx');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"useTool" must be imported from "annota/react"');
    expect(result.stderr).toContain('"PointTool" must be imported from "annota/tools"');
    expect(result.stderr).toContain('"loadH5Masks" must be imported from "annota/loaders"');
    expect(result.stderr).toContain('non-canonical package entry "annota/dist/index.css"');
  });
});
