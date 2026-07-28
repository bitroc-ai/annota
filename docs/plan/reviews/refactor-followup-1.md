---
id: refactor-followup
status: blocked
reviewed-at: 2026-07-27
commit: 8a7b3484ae80c5963ff094d93b0e291e10422bcb
---

# Annota 1.0 发布与文档 Follow-up 独立验证

## Findings

1. **P1 · blocking — changelog commit/push 的真实失败会被吞掉，workflow 仍会继续发布 npm 包。**

   - `.github/workflows/publish.yml:105-133` 的正常路径已经按
     generate changelog → import gate → 含最终 changelog 的 docs build 排序，
     并且 build 位于 commit/publish 之前。
   - 但 `.github/workflows/publish.yml:140-141` 对 `git commit` 和 `git push` 都追加了
     `|| echo`。因此权限不足、远端冲突、网络错误或 hook 失败都会被转换成成功退出；
     `.github/workflows/publish.yml:143-163` 随后仍会执行 npm ownership 检查和
     `pnpm publish`。这直接违反任务要求的 commit/push → npm publish 严格顺序和
     “失败必须阻断”语义，并可能发布一个没有把最终 changelog 推入 `main` 的版本。
   - `test/docs/delivery-contract.test.ts:8-21` 只比较文本位置，而且只断言 publish 位于
     docs build 之后，没有断言 publish 位于 commit 之后，也没有覆盖 commit/push
     失败传播，所以测试会对这个发布路径给出假阳性。

2. **P1 · blocking — 用户可复制的文档仍包含不存在或非 canonical 的 1.0 API。**

   - `src/svelte/index.ts:3-5`（以及构建后的 `dist/svelte/index.d.ts:1-3`）只从
     `annota/svelte` 导出 `AnnotaProvider`、`Annotator` 和 `Viewer`，没有
     `AnnotaViewer`。但以下 fenced 示例仍直接导入不存在的 `AnnotaViewer`：
     - `docs/src/content/docs/framework-selection.mdx:66`
     - `docs/src/content/docs/guides/framework-comparison.mdx:224`
     - `docs/src/content/docs/getting-started/installation.mdx:151`
     - `docs/src/content/docs/getting-started/quick-start/svelte.mdx:22,90`
   - 文档自身的 Svelte API 表也在
     `docs/src/content/docs/api/svelte/components.mdx:121-125` 正确说明组件名是
     `Viewer`，因此这些 quick-start 示例与正式入口和同站 API reference 均冲突。
     Astro 构建只渲染代码块而不类型检查其中的 import，所以最终 changelog docs build
     成功也无法发现该问题。
   - 用户可见首页同样尚未完成 canonical 化：
     `docs/src/pages/index.astro:203-204` 从根入口导入 React API、`useTool` 和
     `RectangleTool`，`docs/src/pages/index.astro:234` 又从根入口导入
     `RectangleTool`。检查器只收集 `.md/.mdx`
     （`scripts/check-doc-imports.mjs:236-240`），所以 CI 仍会放过这些首页示例。

3. **P2 · blocking — fenced-code 扫描会漏掉 CommonMark 合法的不同长度 closing fence。**

   - `scripts/check-doc-imports.mjs:143-152` 用反向引用 `\1` 要求 closing fence 与
     opening fence 字符串完全相同；但 Markdown 允许 closing fence 使用不少于 opening
     fence 的同类字符。
   - 受控复现中，三个反引号开启、四个反引号关闭的合法 `tsx` 代码块包含
     `import { PointTool } from "annota"`，检查器却返回
     `Checked 1 Markdown files: all fenced imports are canonical.`。这意味着“扫描全部
     `.md/.mdx` fenced code examples”的自动化合同仍可被普通 Markdown 写法绕过。
   - `test/docs/import-contract.test.ts:15-31` 只覆盖等长三反引号 fixture，没有覆盖
     合法的更长 closing fence。

4. **P2 · blocking — 检查器无法区分历史迁移对照与当前可复制示例，会对 fenced
   Before/After 迁移说明产生假阳性。**

   - `scripts/check-doc-imports.mjs:178-190` 对任何 fence 内的旧 root React/tool/loader
     import 无条件报错，没有基于 fence 元数据、显式标记或迁移上下文的豁免机制。
   - 受控复现使用标题 `Before (0.x, historical only)` 的旧 import fence 和紧随其后的
     canonical `After (1.0)` fence，检查器仍以退出码 1 拒绝 Before 示例。当前
     `test/fixtures/docs-imports/valid.mdx:11` 只验证正文 inline-code 可以提到旧 CSS
     路径，并未验证任务要求的迁移对照不产生假阳性。

## 已确认正确的部分

- `package.json` 的 `benchmark:ci` 为
  `pnpm build && node benchmarks/annota-benchmark.mjs --ci`。移走现有
  `dist/core.js` 后直接执行仍会先重建并成功完成 1k/10k 固定 seed benchmark。
- CI 和 publish workflow 都真实运行 `pnpm benchmark:ci`、
  `pnpm check:docs-imports` 与 docs build；`CONTRIBUTING.md`、`PUBLISHING.md` 和
  `package.json` 对 benchmark 自构建行为及相关命令的描述一致。
- changelog generator 保留合法 frontmatter；以临时 `v9.9.9-verifier` release note
  生成最终 changelog 后，依次运行 import gate 和 docs build 成功，随后恢复原文件，
  工作区未留下临时 changelog 修改。
- 当前 MD/MDX corpus 的 import gate 通过；受控 invalid fixture 以退出码 1 拒绝
  React/tools/loaders root imports 和旧 CSS subpath。

## 验证记录

在指定 commit 上执行：

- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：17 files / 174 tests 通过。
- `pnpm build`：通过。
- `pnpm test:consumer`：通过；isolated root、React、legacy React、Svelte、tools 和
  loaders packed consumers 全部通过。
- 缺少 `dist/core.js` 时直接执行 `pnpm benchmark:ci`：通过；1k load 21.26 ms /
  update 15.36 ms，10k load 95.31 ms / update 11.72 ms。
- 临时生成 changelog 后执行 `pnpm check:docs-imports` 与
  `pnpm --dir docs build`：通过；47 pages、Pagefind 和 sitemap 生成。
- `node scripts/check-doc-imports.mjs test/fixtures/docs-imports/invalid.mdx`：
  按预期退出 1。
- `git diff --check`：通过；写入本 review 前工作区干净。

## 结论

**blocked**

benchmark 自构建、最终 changelog 的 docs build 顺序以及基础 MD/MDX import gate
均已落地，但发布失败传播仍不安全，用户文档仍包含不存在/非 canonical 的示例，而且
fence 扫描有可复现的漏检与迁移对照假阳性。以上问题关闭前不应视为 follow-up 完成。
