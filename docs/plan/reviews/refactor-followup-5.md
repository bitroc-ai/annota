---
id: refactor-followup
status: blocked
reviewed-at: 2026-07-27
commit: ead0ff3fd3a73807111a9d00ab9eb76dc9d0c140
---

# Annota 1.0 发布与文档 Follow-up 第五轮独立验证

## Finding

1. **P2 · blocking — official Astro AST extractor 漏检使用普通 quoted attribute 的真实
   `<Code>` 静态代码示例。**

   - 任务合同要求扫描 Astro 页面中显式传给代码展示组件的用户示例，并要求从真实 Astro
     markup AST 节点识别组件（`docs/plan/tasks/refactor-followup.md:67-76`）。
   - 当前实现只接受 `candidate.kind === 'expression'`
     （`scripts/check-doc-imports.mjs:193-202`），因此可以检查
     `<Code code={"..."} />`，但会跳过同样是静态字面量的
     `<Code code="import { PointTool } from 'annota';" />`。
   - 对上述最小合法 Astro 文件，`@astrojs/compiler` transform 成功；官方 AST 将 `code`
     属性表示为 `type: "attribute"`、`kind: "quoted"`，其 `value` 就是静态代码文本。
     checker 却以 0 退出，未报告应有的 root `PointTool` 违规。
   - 新增的 Astro position fixtures 只使用 brace expression literal
     `code={...}`，所以未覆盖这一合法写法。该遗漏会让可复制执行的旧 root import 绕过
     发布门禁。

## 第四轮 2 项关闭情况

| # | 第五轮结果 | 验证摘要 |
| --- | --- | --- |
| 1 | partial / blocked | official Astro AST 已关闭第四轮的精确假阳性：frontmatter、其他 tag attribute、script 里的伪 `<Code>` 均被忽略，两个真实 expression-literal `<Code>` 均被报告；项目 invalid fixture 也精确只报真实组件中的 1 条 `useTool`。但 quoted static `code` 属性被漏检，见本轮 finding。 |
| 2 | closed | 第四轮 alias 重赋反例现在仅在重赋前、恢复 root source 后各报告 1 条 `PointTool`，本地对象阶段不报错；项目 invalid fixture 精确报告 6 条，valid fixture 覆盖两级 snapshot、canonical ↔ root、分支/循环保守出口且通过。 |

## 已确认正确的部分

- 当前 81 个文档源 checker 通过；完全移走 `dist` 后仍通过。
- 完全移走 `dist` 后，既有 namespace invalid fixture 仍精确产生 5 条 `PointTool` 和
  2 条 `loadH5Masks` 诊断。
- namespace reassign invalid fixture 精确产生 6 条 `PointTool` 诊断；valid fixture 通过。
- Astro position invalid fixture 精确只产生真实 `<Code>` 中的 1 条 `useTool` 诊断，
  frontmatter、attribute、script 与 expression 文本中的伪组件均未误报。
- Publish workflow 的 SemVer、env 边界与命令顺序未被本轮改动破坏；delivery contract
  测试通过，workflow YAML 可解析。

## 验证记录

在指定 commit 上执行：

- `pnpm check:docs-imports`：通过；检查 81 个文档文件。
- `pnpm exec vitest run test/docs/import-contract.test.ts test/docs/delivery-contract.test.ts`：
  2 files / 16 tests 通过。
- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：17 files / 185 tests 通过。
- `pnpm build`：通过。
- `pnpm --dir docs build`：通过；47 pages、Pagefind 和 sitemap 生成。
- workflow YAML parser：通过。
- no-dist corpus/source-export 与 namespace 精确诊断矩阵：通过。
- 第四轮 Astro fake-component 精确复现：仅两个真实组件产生诊断。
- 第四轮 source-order alias 精确复现：仅重赋前和恢复 root source 后产生 2 条诊断。
- quoted static `code` 属性最小复现：Astro compiler 接受，checker 错误地以 0 退出。
- `git diff --check`：通过；写入本 review 前工作区干净。

## 结论

**blocked**

第四轮的两个精确复现均已实质修复，namespace source-order 合同已由正反 fixture 覆盖；
但真实 `<Code>` 的普通 quoted static `code` 属性仍可绕过 import 门禁。补齐 official AST
`quoted` attribute 提取与相应正反回归 fixture 前，本 follow-up 不应交付。
