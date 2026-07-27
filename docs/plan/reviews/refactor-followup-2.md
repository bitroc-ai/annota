---
id: refactor-followup
status: blocked
reviewed-at: 2026-07-27
commit: af1a25f1c96ee7469b0a6e5c7e11320ce1e39e33
---

# Annota 1.0 发布与文档 Follow-up 第二轮独立验证

## Findings

1. **P1 · blocking — `workflow_dispatch` 的 version 仍直接插入 shell，未验证的输入可执行任意命令。**

   - `.github/workflows/publish.yml:98-103` 把
     `${{ github.event.inputs.version }}` 直接放进双引号 shell 赋值，
     `.github/workflows/publish.yml:120-122,147` 又把对应 output 直接插入 shell 命令，
     全程没有 semver 格式验证，也没有通过 `env` 传递不可信表达式。
   - 例如 dispatch 输入 `1.2.3"; printf WORKFLOW_INPUT_INJECTION; #` 会把第 99 行展开为
     `VERSION="1.2.3"; printf WORKFLOW_INPUT_INJECTION; #"`。这不是普通的无效版本失败，
     而是在拥有 `contents: write` 权限的发布 job 中执行注入命令；后续步骤还涉及
     changelog push 和 npm publish。
   - YAML 本身可以解析，但 shell 数据边界不安全。应先以 `env` 接收输入并严格验证
     允许的发布版本格式，再把验证后的值写入 `$GITHUB_OUTPUT`；相关测试目前只检查
     commit/push 文本顺序和 `||`，没有覆盖 dispatch 输入边界。

2. **P1 · blocking — Astro 用户示例扫描只覆盖一种组件拼写，任务要求的显式展示 snippet
   仍可被合法 Astro 语法绕过。**

   - `scripts/check-doc-imports.mjs:222-234` 只匹配自闭合的
     `<Code ... code={\`...\`} ... />`。它不识别同样显式且合法的字符串表达式
     `code={'...'}`，也不识别 `<Code code={\`...\`}></Code>`。
   - 两个独立受控用例分别放入
     `code={'import { PointTool } from "annota";'}` 和非自闭合组件内的
     `import { loadH5Masks } from "annota"`；检查器均以退出码 0 报告
     “all user examples use canonical imports”。
   - 这与 `docs/plan/tasks/refactor-followup.md:64-67` 的“扫描 Astro 页面中显式传给
     代码展示组件的用户示例”合同不一致。当前
     `test/fixtures/docs-imports/{valid,invalid}.astro` 都只覆盖唯一被 regex 支持的
     template-literal + self-closing 形式，因此测试仍会假阳性。

3. **P2 · blocking — 新增的入口存在性检查仅验证 named imports，default 和 root
   未知符号仍会漏报。**

   - `scripts/check-doc-imports.mjs:236-247` 在没有 `{ ... }` 时返回空 names；
     `scripts/check-doc-imports.mjs:260-285` 对 root 未命中已知 framework/tool/loader
     集合的名字也直接放行。
   - 因而 fenced `import AnnotaViewer from "annota/svelte"`（该入口没有 default
     export）与 `import { DefinitelyNotAnAnnotaApi } from "annota"` 都返回退出码 0。
     前者复现了上一轮“不存在 API”这一类错误，只是换成 default import 即可绕过；
     后者说明 root 示例的存在性仍未进入语义门禁。
   - 当前 corpus 经人工抽查与构建后声明对照未再发现同类实际错误，但自动化仍不能保证
     “所有用户示例 API 存在”，且 fixture 只验证 named `AnnotaViewer`。

4. **P2 · blocking — fence parser 把四空格缩进代码块误当 fenced code，产生新的
   CommonMark 假阳性。**

   - `scripts/check-doc-imports.mjs:194-196` 的 opening regex 接受任意数量空格或 tab；
     closing regex 在 `scripts/check-doc-imports.mjs:200-202` 也一样。CommonMark fence
     最多只能缩进三个空格；四空格内容是 indented code block，其中的反引号只是文本。
   - 受控 `.mdx` 使用四空格缩进的三反引号文本并包含旧 `PointTool` import，检查器却
     以退出码 1 报错。该门禁因此会阻止一个不属于任务扫描范围的合法 Markdown 示例。
   - 新增 tests 已正确覆盖 longer closer、tilde fence 和 shorter nested fence，但没有
     覆盖 0–3 空格与 4 空格的 CommonMark 边界。

## 上一轮 4 项关闭情况

| # | 第二轮结果 | 验证摘要 |
| --- | --- | --- |
| 1 | closed | publish 已按 generate → checker → final docs build → commit/push → npm publish 排序；明确 no-change 分支外的 `git commit`/`git push` 不再带 `||`，`set -euo pipefail` 会传播失败。 |
| 2 | closed | Svelte 实际入口及构建声明导出 `Viewer`；上一轮列出的 MD/MDX 均改用 `Viewer`，首页 React/Svelte 展示 snippet 也使用 canonical framework/tool subpaths。 |
| 3 | closed | 三反引号开/四反引号关、长 fence 内短 fence、tilde fence 三种受控违规均被检测并返回 1。 |
| 4 | closed | `annota-legacy-imports` 只作用于其 opening fence；紧随其后的普通旧 import 仍被拒绝一次。 |

## 已确认正确的部分

- 当前 checker 会扫描仓库内 `.md`、`.mdx`、`.astro`，当前 78 个文档源通过。
- canonical React/Svelte/tools/loaders named imports 会与入口符号集合对照；不存在的
  named `AnnotaViewer` from `annota/svelte` fixture 被拒绝。
- CI、publish、贡献和发布文档中的 benchmark/import/docs-build 命令保持一致。
- changelog generator 仍保留 frontmatter；临时生成最终 changelog 后的 checker 与
  docs build 成功，恢复后未污染工作区。
- `publish.yml` 通过 YAML parser；未发现 commit/push 新增 shell 语法或 YAML quoting
  错误。其剩余问题是不可信 dispatch expression 的 shell 注入边界，见 finding 1。

## 验证记录

在指定 commit 上执行：

- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：17 files / 177 tests 通过。
- 定向 delivery/import tests：2 files / 8 tests 通过。
- `pnpm build`：通过。
- `pnpm test:consumer`：通过；isolated root、React、legacy React、Svelte、tools 和
  loaders packed consumers 全部通过。
- 缺少 `dist/core.js` 时直接执行 `pnpm benchmark:ci`：通过；1k load 20.75 ms /
  update 17.29 ms，10k load 108.56 ms / update 11.08 ms。
- 临时生成 `v9.9.9-verifier-2` changelog 后执行 `pnpm check:docs-imports` 与
  `pnpm --dir docs build`：通过；47 pages、Pagefind 和 sitemap 生成，原 changelog
  随后恢复。
- longer closer / nested shorter / tilde fixture：按预期退出 1。
- 单 fence legacy marker + 后续普通旧 import：按预期只报告后者并退出 1。
- Astro string expression、Astro 非自闭合 Code、default 不存在 API、root 未知 API：
  均错误退出 0；四空格 indented block 错误退出 1。
- `git diff --check`：通过；写入本 review 前工作区干净。

## 结论

**blocked**

上一轮四项 finding 均已关闭，完整构建、consumer、fresh benchmark 和最终 changelog
文档构建也通过。但 publish dispatch 仍存在命令注入，Astro/符号门禁仍有可复现漏报，
fence parser 又引入了 CommonMark 假阳性，因此 follow-up 尚未达到可交付状态。
