---
id: refactor-followup
status: passed
reviewed-at: 2026-07-27
---

# Annota 1.0 发布与文档 Follow-up 最终验证

## 结论

外部 review 提出的发布顺序、benchmark 前置构建和文档 canonical import 三项问题
已经完成修复。独立 verify 共执行六轮；前五轮发现的发布失败传播、Svelte/首页示例、
CommonMark fence、Astro 展示代码、公共导出存在性、namespace alias 和 parser
假阳性/漏报均在同一 follow-up 分支关闭。第六轮结论为 `pass`，没有遗留 finding。

## 最终行为

- Publish workflow 严格执行：
  changelog 生成 → canonical import 检查 → 最终文档构建 → changelog commit/push
  → npm publish；真实 commit/push 失败会阻断发布。
- 手动发布版本只通过环境变量进入 shell，并经严格 SemVer 校验；稳定版和 prerelease
  受支持，非法或可注入输入被拒绝。
- `pnpm benchmark:ci` 会自行构建，在缺少 `dist/core.js` 时可直接运行。
- 文档门禁从 TypeScript 源入口推导实际 exports，不依赖 `dist`；覆盖 MD/MDX fenced
  code 与真实 Astro `Code` component 的 quoted/expression 静态代码。
- React、Svelte、tools、loaders、styles 示例均使用 1.0 canonical subpath；不存在
  API、错误 default/named/namespace/require/dynamic import 会被拒绝。
- CommonMark fence、显式历史迁移豁免、Astro 注释/伪组件和 namespace 重赋均有
  正反回归测试。

## 验证

| 门禁 | 结果 |
| --- | --- |
| `pnpm check:docs-imports` | 82 个文档源通过 |
| 文档 delivery/import contract | 2 files / 17 tests 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm exec vitest run` | 17 files / 186 tests 通过 |
| `pnpm build` | ESM/CJS/DTS/Svelte 通过 |
| `pnpm test:consumer` | 6 类隔离 packed consumer 通过 |
| Missing-dist checker/benchmark | 通过并自动重建 |
| 临时最终 changelog + docs build | 47 pages、Pagefind、sitemap 通过并恢复无污染 |
| Publish workflow YAML / diff check | 通过 |

