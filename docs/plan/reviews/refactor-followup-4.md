---
id: refactor-followup
status: blocked
reviewed-at: 2026-07-27
commit: 4db054cd66c03cde3e0d6c81b516118ca1690ff2
---

# Annota 1.0 发布与文档 Follow-up 第四轮独立验证

## Findings

1. **P2 · blocking — Astro extractor 仍把其他组件静态字符串中的 `<Code>` 文本当作真实
   展示组件。**

   - `scripts/check-doc-imports.mjs:287-339` 仍在整个 Astro body 上正则搜索 `<Code`；
     新增的 `astroCommentRanges`（`scripts/check-doc-imports.mjs:183-239`）只排除了注释
     range，没有确认匹配位置是否真是 Astro component opening tag。
   - 独立受控文件包含合法 Astro：
     `<div data-example={'<Code code={"import { PointTool } from \\'annota\\';"} />'} />`，
     后面另有一个真实且 canonical 的 `<Code>`。`<Code ...>` 在这里仅是 `div` 属性的
     静态字符串内容，不会创建或展示 Code 组件；`@astrojs/compiler` transform 已成功，
     但 checker 仍报告一条 root `PointTool` 违规并退出 1。
   - 第三轮 finding 的 HTML/Astro 多行注释、真实 Code 字符串中的 comment-like 文本及
     注释相邻真实 Code 均已正确处理，但任务合同要求扫描“代码展示组件”，不能仅靠排除
     两类 comment 后把字符串里的组件形文本也当成组件。

2. **P2 · blocking — namespace alias 推导是全文件单调集合，静态重赋后仍保留失效来源，
   产生臆测性违规。**

   - `scripts/check-doc-imports.mjs:641-674` 的 fixpoint 只向 `namespaceSymbols` 添加来源，
     从不在后续赋值覆盖 alias 时使来源失效；`scripts/check-doc-imports.mjs:709-722`
     随后对文件内所有 property/type access 使用这个全局集合，没有控制流位置。
   - 独立 fenced 反例：
     `let Alias = RootApi; Alias = { PointTool: class LocalPointTool {} };`
     `new Alias.PointTool()`。使用发生前，Alias 已被静态、无条件重赋为本地对象，
     `PointTool` 是本地属性；checker 仍按早先 root namespace 来源报告一条
     `annota/tools` 违规并退出 1。
   - 新任务合同要求沿“静态 alias 链”追踪且动态 key 不得产生臆测性违规。新增 dynamic
     computed-key fixture 已正确不报错，但这种同样可静态判定的 alias 覆盖仍是假阳性。

## 第三轮 3 项关闭情况

| # | 第四轮结果 | 验证摘要 |
| --- | --- | --- |
| 1 | partial / blocked | 独立 namespace fixture 精确报告 5 条 `PointTool` 和 2 条 `loadH5Masks`，覆盖 namespace/type namespace、direct require/dynamic、alias、静态 computed destructuring 和后续 assignment；dynamic computed key 不报错，完全移走 `dist` 后结果不变。但 alias 重赋假阳性仍阻断，见 finding 2。 |
| 2 | partial / blocked | HTML/Astro 多行注释被忽略；真实 Code 字符串内 comment-like 文本不被屏蔽；相邻真实 Code 仍被检查。但其他字符串里的伪 `<Code>` 假阳性仍阻断，见 finding 1。 |
| 3 | closed | backtick info 含 backtick 的非法 opener 不进入 fence 状态，后续合法 fence仍检查；tilde info 含 backtick 仍作为合法 opener并检测违规。 |

## 已确认正确的部分

- Publish workflow 的 env 边界、strict SemVer、prerelease flag、后续 env quoting、严格发布
  顺序与 commit/push 失败传播保持正确；YAML parser 可读取 workflow。
- 当前 80 个文档源 checker 通过；完全移走 `dist` 后仍通过。
- namespace fixture 在正常/no-dist 两种环境均精确产生 5 + 2 条诊断；
  dynamic-key fixture 通过。
- CommonMark 0–3/4/tab、long closer、short nested、tilde、legacy scope、非法 backtick
  opener 状态恢复全部通过。
- HTML/Astro comments、comment-like literal、相邻真实 Code 的项目 fixtures 全部通过。

## 验证记录

在指定 commit 上执行：

- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：17 files / 183 tests 通过。
- 定向 delivery/import tests：2 files / 14 tests 通过。
- `pnpm build`：通过。
- `pnpm test:consumer`：通过；全部 isolated packed consumers 通过。
- 缺少 `dist/core.js` 时直接执行 `pnpm benchmark:ci`：通过；1k load 20.92 ms /
  update 16.28 ms，10k load 107.00 ms / update 12.64 ms。
- `pnpm --dir docs build`：通过；47 pages、Pagefind 和 sitemap 生成。
- no-dist corpus/namespace、精确诊断计数、Astro comments/adjacency、CommonMark state、
  dynamic/static computed key 定向矩阵：指定行为均符合预期。
- 其他组件字符串里的伪 `<Code>`：错误产生 1 条诊断；重赋后的 alias 本地属性：
  错误产生 1 条诊断。
- `git diff --check`：通过；写入本 review 前工作区干净。

## 结论

**blocked**

第三轮三个 findings 的指定复现路径均得到实质修复，完整门禁也通过；但 Astro 组件识别
仍不是词法/语法位置感知，namespace alias 推导也不是控制流感知，两者都会拒绝合法文档
示例。以上自动化假阳性关闭前，follow-up 仍不应交付。
