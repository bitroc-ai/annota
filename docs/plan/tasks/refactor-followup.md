---
id: refactor-followup
scope: annota
status: done
depends-on: [refactor-all]
---

# Annota 1.0 发布与文档 Review Follow-up

## Objective

一次性修复 Annota 1.0 外部 review 发现的三个交付边界问题：

1. 发布 workflow 必须在生成最终 changelog 后、提交 changelog 和发布 npm 包之前，
   对包含新 changelog 的文档站执行构建；无效 MDX 必须阻断发布。
2. `pnpm benchmark:ci` 作为独立公开贡献者命令时，必须自行保证运行所需的
   `dist/core.js` 已构建，不能依赖调用者隐式记住前置步骤。
3. 所有用户文档示例必须使用 1.0 canonical imports：
   - framework-neutral core：`annota`
   - React：`annota/react`
   - Svelte：`annota/svelte`
   - tools：`annota/tools`
   - loaders：`annota/loaders`
   - styles：`annota/styles.css`

除批量修正文档外，还要增加自动化静态门禁，使 MD/MDX 示例不能再次从
framework-neutral 根入口导入 React API，或从非 canonical 入口导入 tools/loaders。

## Context

- `docs/INDEX.md`
- `docs/plan/analysis/annota-refactoring.md`
- `docs/plan/decisions/annota-1.0-atomic-delivery.md`
- `docs/src/content/docs/guides/migration-1-0.mdx`
- `CONTRIBUTING.md`
- `PUBLISHING.md`
- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`

## Path

允许修改：

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `package.json`
- `pnpm-lock.yaml`
- `CONTRIBUTING.md`
- `PUBLISHING.md`
- `scripts/**`
- `test/**`
- `docs/src/content/docs/**`
- `docs/src/pages/**`
- `docs/plan/tasks/refactor-followup.md`
- `docs/plan/reviews/refactor-followup*.md`

不得修改核心库运行时或进行无关格式化。

## Required behavior

- changelog 生成后的 docs build 必须位于 changelog commit 与 npm publish 之前。
- workflow 不得在验证最终 changelog 前把它推送到 `main`。
- 手动发布版本必须先通过环境变量进入严格 SemVer 验证；支持 prerelease，拒绝 build
  metadata，未验证的 workflow input 不得直接插入 shell。
- `pnpm benchmark:ci` 在清理/缺少 `dist/core.js` 时仍可从 fresh checkout 成功运行。
- CI/publish 与贡献文档描述同一组实际命令，避免只修文档或只修 workflow。
- 扫描全部 `.md` / `.mdx` fenced code examples 以及 Astro 页面中显式传给代码展示组件的
  用户示例；正文中解释旧入口的迁移对照可以保留，显式标记的历史 fence 可豁免，
  但可复制执行的当前示例必须全部使用 canonical subpaths。
- Markdown fence 遵循 CommonMark 的 0–3 空格边界；四空格和 tab 缩进代码不作为 fence。
- 静态门禁应从 TypeScript 公共入口推导完整 export contract，检查 named、default、
  type、alias 和 namespace 用法，且不得依赖 docs Vite alias、构建后的 `dist` 或单个文件。

## Verification

全部实现完成后统一运行：

```bash
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm test:consumer
pnpm benchmark:ci
pnpm --dir docs build
```

另外必须验证：

- 缺少 `dist/core.js` 时直接执行 `pnpm benchmark:ci` 成功。
- 文档 import 静态门禁在当前文档上通过，并对受控违规 fixture 返回失败。
- 使用临时 changelog 内容按 publish 顺序运行 docs build 成功，且不污染工作区。
- `git diff --check` 与最终工作区状态干净。
