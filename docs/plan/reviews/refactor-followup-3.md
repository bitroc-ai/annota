---
id: refactor-followup
status: blocked
reviewed-at: 2026-07-27
commit: c129a088e8eff03a069d02a8d548ddd361351fcf
---

# Annota 1.0 发布与文档 Follow-up 第三轮独立验证

## Findings

1. **P1 · blocking — AST import gate 仍只覆盖特定语法形状，任务明确要求的
   namespace/require/dynamic 合同存在多条可复现漏报路径。**

   - `scripts/check-doc-imports.mjs:479-510` 只在 module call 是 variable initializer
     或 initializer 的直接 property 时提取 require/dynamic 请求；
     `scripts/check-doc-imports.mjs:515-545` 的 namespace 第二遍也只识别 namespace
     identifier 上的直接 property/element access。
   - 以下四个独立 fenced 反例都使用真实合法的 TypeScript/JavaScript 写法，且都应把
     root `PointTool` 指向 `annota/tools`，但检查器全部错误返回退出码 0：
     - `import * as RootApi from "annota"; const { PointTool } = RootApi;`
     - `import type * as RootApi from "annota"; type Tool = RootApi.PointTool;`
     - 表达式语句 `require("annota").PointTool` 以及
       `(await import("annota")).loadH5Masks`
     - `const { ["PointTool"]: Point } = require("annota")`
   - 这说明 `test/fixtures/docs-imports/export-contract-invalid.mdx` 覆盖的是
     direct namespace property、initializer property 和普通 object binding 等特定 AST
     形状，不足以证明 `docs/plan/tasks/refactor-followup.md:70-72` 规定的
     named/default/type/alias/namespace/require/dynamic 语义合同。
   - source export contract 本身已确认可在完全缺少 `dist` 时工作；本 finding 是消费这些
     contract 的 AST traversal 不完整，而不是重新依赖构建产物。

2. **P2 · blocking — Astro scanner 会把注释里的 `<Code>` 当作用户可见示例，产生稳定
   假阳性。**

   - `scripts/check-doc-imports.mjs:226-273` 从 frontmatter 之后直接正则搜索 `<Code`，
     没有排除 HTML comment 或 Astro/JSX comment。
   - 受控 `.astro` 同时包含
     `<!-- <Code code={\`import { PointTool } from "annota";\`} /> -->` 和
     `{/* <Code code={'import { loadH5Masks } from "annota";'}></Code> */}`；
     两者都不会渲染给用户，检查器却报告两条违规并退出 1。
   - 第二轮要求的单双引号/template literal、escape、多行和非自闭合组件已正确支持，
     frontmatter 也被忽略；但任务要求扫描的是“显式传给代码展示组件的用户示例”，
     不是被注释掉的源文本。现有 Astro fixtures 没有覆盖 comment boundary。

3. **P2 · blocking — fence parser 尚未完整遵循 CommonMark：backtick info string 含
   backtick 的非 fence 会被误扫。**

   - `scripts/check-doc-imports.mjs:147-168` 已正确限制 0–3 个空格并支持 longer closer、
     shorter nested fence 和 tilde fence；但 opening regex
     `(`{3,}|~{3,})([^\r]*)` 没有实施 CommonMark 对 backtick fence info string 的限制：
     info string 不得再包含 backtick。
   - 受控文档以 `` ```tsx` `` 开头，下一行是旧 `PointTool` import。该首行按 CommonMark
     不是 opening fence，import 也不属于 fenced example；检查器却将其作为 fence 内容
     并退出 1。
   - 这关闭了上一轮 4-space/tab finding，却在同一个“遵循 CommonMark”合同中保留了另一
     个可复现假阳性；当前 indentation/fence-variant fixtures 未覆盖该规则。

## 第二轮 4 项关闭情况

| # | 第三轮结果 | 验证摘要 |
| --- | --- | --- |
| 1 | closed | dispatch input 与 tag ref 都通过 step `env` 进入 shell，独立 validator 拒绝 build metadata、前导零、空白、恶意 shell 字符和尾随换行；稳定版/预发布版通过。后续 changelog/commit 均使用已验证 env 并加引号，release action 的 prerelease flag 正确来自验证后版本。 |
| 2 | partial / blocked | Astro static literal 现支持单双引号、template literal、escape、多行和自闭合/非自闭合组件，且忽略 frontmatter；但 comment false positive 仍阻断，见 finding 2。 |
| 3 | partial / blocked | 完整 export contract 从 `src` 入口递归推导，完全移走 `dist` 后 current corpus 仍通过且 invalid fixture 仍失败；named/default/type alias/direct namespace 与常见 require/dynamic/CSS side-effect 已覆盖，但其他合法 namespace/require/dynamic AST 形状漏报，见 finding 1。 |
| 4 | partial / blocked | 0–3 空格会扫描，4 空格/tab 会忽略；long closer、short nested、tilde 和单 fence legacy scope 均正确。但非法 backtick info 被当 fence，见 finding 3。 |

## 已确认正确的部分

- Publish 顺序仍为 generate changelog → import gate → final docs build → commit/push →
  npm publish；commit/push 失败不会被吞掉。
- `validate-release-version.mjs` 接受 `1.2.3`、`0.0.0`、`2.0.0-rc.1`、
  `1.2.3-alpha-beta.7`；拒绝 `1.2`、`01.2.3`、`1.2.3-01`、
  `1.2.3+build.1`、尾随空格/换行和 shell injection payload。
- 完全移走 `dist` 后，`pnpm check:docs-imports` 对当前 79 个文档源通过，
  `export-contract-invalid.mdx` 仍按预期退出 1。
- canonical CSS side-effect import 通过；CSS fenced
  `@import "annota/dist/index.css"` 被正确拒绝。
- YAML parser 可读取 `publish.yml`，未发现新增 YAML 或 shell quoting 错误。

## 验证记录

在指定 commit 上执行：

- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：17 files / 180 tests 通过。
- 定向 delivery/import tests：2 files / 11 tests 通过。
- `pnpm build`：通过。
- `pnpm test:consumer`：通过；isolated root、React、legacy React、Svelte、tools 和
  loaders packed consumers 全部通过。
- 缺少 `dist/core.js` 时直接执行 `pnpm benchmark:ci`：通过；1k load 21.89 ms /
  update 16.30 ms，10k load 103.25 ms / update 13.26 ms。
- 临时生成 `v9.9.9-verifier-3` changelog 后执行 `pnpm check:docs-imports` 与
  `pnpm --dir docs build`：通过；47 pages、Pagefind 和 sitemap 生成，原 changelog
  随后恢复。
- no-dist checker/current corpus/export-invalid、SemVer、Astro literal/frontmatter、
  CommonMark indentation/variants、legacy scope 与 CSS side-effect 定向矩阵：
  主路径均符合预期。
- namespace destructure、type namespace、direct require/dynamic property 和 computed
  binding：错误退出 0；Astro comments 与非法 backtick-info 非 fence：错误退出 1。
- `git diff --check`：通过；写入本 review 前工作区干净。

## 结论

**blocked**

发布输入边界与 source-derived export contract 的基础设施已明显加强，第二轮 findings
的主路径均有实质修复，所有全量门禁也通过。但 import AST traversal 仍漏掉任务点名的
合法使用形状，Astro 与 CommonMark parser 各有可复现假阳性，因此 follow-up 仍未达到
可交付状态。
