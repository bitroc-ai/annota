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
  it('accepts canonical imports, one explicitly marked historical fence, and the current corpus', () => {
    const fixture = checkDocs(
      'test/fixtures/docs-imports/valid.mdx',
      'test/fixtures/docs-imports/valid.astro',
      'test/fixtures/docs-imports/indented-code-valid.mdx',
      'test/fixtures/docs-imports/html-comment-valid.astro',
      'test/fixtures/docs-imports/astro-comment-valid.astro',
      'test/fixtures/docs-imports/backtick-info-valid.mdx',
      'test/fixtures/docs-imports/namespace-dynamic-key-valid.mdx'
    );
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
    expect(result.stderr).toContain('"AnnotaViewer" is not exported by "annota/svelte"');
    expect(result.stderr).toContain('"DefinitelyNotAnAnnotaApi" is not exported by "annota"');
  });

  it('recognizes longer CommonMark closers, nested shorter fences, and tilde fences', () => {
    const result = checkDocs('test/fixtures/docs-imports/fence-variants-invalid.mdx');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"PointTool" must be imported from "annota/tools"');
    expect(result.stderr).toContain('"loadH5Masks" must be imported from "annota/loaders"');
    expect(result.stderr).toContain('"useTool" must be imported from "annota/react"');
  });

  it('scopes the legacy marker to exactly one fence', () => {
    const result = checkDocs('test/fixtures/docs-imports/legacy-scope-invalid.mdx');
    expect(result.status).toBe(1);
    expect(result.stderr.match(/"useTool" must be imported/g)).toHaveLength(1);
  });

  it('checks displayed Astro snippets without scanning Astro source imports', () => {
    const result = checkDocs('test/fixtures/docs-imports/invalid.astro');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"PointTool" must be imported from "annota/tools"');
    expect(result.stderr).toContain('"loadH5Masks" must be imported from "annota/loaders"');
    expect(result.stderr).toContain('"useTool" must be imported from "annota/react"');
    expect(result.stderr).not.toContain('FrontmatterOnlyApi');
  });

  it('derives complete source export contracts for default, named, type, alias, and namespace forms', () => {
    const result = checkDocs('test/fixtures/docs-imports/export-contract-invalid.mdx');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('default export is not available from "annota/svelte"');
    expect(result.stderr).toContain('"DefinitelyMissingType" is not exported by "annota/react"');
    expect(result.stderr).toContain('"PointTool" must be imported from "annota/tools"');
    expect(result.stderr).toContain('"DefinitelyMissingLoader" is not exported by "annota/loaders"');
    expect(result.stderr).toContain('default export is not available from "annota/styles.css"');
    expect(result.stderr).toContain('default export is not available from "annota/react"');

    const checker = checkDocs('test/fixtures/docs-imports/valid.mdx');
    expect(checker.status, checker.stderr).toBe(0);
  });

  it('scans fences indented zero through three spaces but ignores four spaces and tabs', () => {
    const result = checkDocs('test/fixtures/docs-imports/fence-indentation-invalid.mdx');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"useTool" must be imported from "annota/react"');
    expect(result.stderr).toContain('"PointTool" must be imported from "annota/tools"');
    expect(result.stderr).toContain('"loadH5Masks" must be imported from "annota/loaders"');
    expect(result.stderr).toContain('"DefinitelyNotAnAnnotaApi" is not exported by "annota"');

    const indented = checkDocs('test/fixtures/docs-imports/indented-code-valid.mdx');
    expect(indented.status, indented.stderr).toBe(0);
  });

  it('tracks namespace sources through destructuring, type names, expressions, and aliases', () => {
    const result = checkDocs('test/fixtures/docs-imports/namespace-forms-invalid.mdx');
    expect(result.status).toBe(1);
    expect(result.stderr.match(/"PointTool" must be imported from "annota\/tools"/g)).toHaveLength(5);
    expect(result.stderr.match(/"loadH5Masks" must be imported from "annota\/loaders"/g)).toHaveLength(2);

    const canonical = checkDocs(
      'test/fixtures/docs-imports/valid.mdx',
      'test/fixtures/docs-imports/namespace-dynamic-key-valid.mdx'
    );
    expect(canonical.status, canonical.stderr).toBe(0);
  });

  it('ignores commented Astro components while checking an adjacent real Code component', () => {
    for (const target of [
      'test/fixtures/docs-imports/html-comment-valid.astro',
      'test/fixtures/docs-imports/astro-comment-valid.astro',
    ]) {
      const result = checkDocs(target);
      expect(result.status, result.stderr).toBe(0);
    }

    const adjacent = checkDocs('test/fixtures/docs-imports/comment-adjacent-invalid.astro');
    expect(adjacent.status).toBe(1);
    expect(adjacent.stderr).toContain('"useTool" must be imported from "annota/react"');
    expect(adjacent.stderr).toContain('"useAnnotator" must be imported from "annota/react"');
    expect(adjacent.stderr).not.toContain('"PointTool" must be imported');
    expect(adjacent.stderr).not.toContain('"loadH5Masks" must be imported');
  });

  it('rejects backticks in backtick-fence info without affecting later fence state', () => {
    const invalidOpener = checkDocs('test/fixtures/docs-imports/backtick-info-valid.mdx');
    expect(invalidOpener.status, invalidOpener.stderr).toBe(0);

    const tilde = checkDocs('test/fixtures/docs-imports/tilde-backtick-info-invalid.mdx');
    expect(tilde.status).toBe(1);
    expect(tilde.stderr).toContain('"PointTool" must be imported from "annota/tools"');

    const state = checkDocs('test/fixtures/docs-imports/illegal-opener-state-invalid.mdx');
    expect(state.status).toBe(1);
    expect(state.stderr).toContain('"useTool" must be imported from "annota/react"');
    expect(state.stderr).not.toContain('"PointTool" must be imported');
  });
});
