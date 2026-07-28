---
id: refactor-all
scope: annota
status: done
depends-on: []
---

# Annota 1.0 一次性重构

## Objective

将
[`docs/plan/analysis/annota-refactoring.md`](../analysis/annota-refactoring.md)
中 `refactor-001` 至 `refactor-016` 的所有阻塞与非阻塞交付内容作为一个原子任务
一次性完成。不得按里程碑或 sprint 提前交付、review 或合并；全部实现完成后再进行
统一 review 和全量测试。

必须满足分析文档第 9 节“完成定义”，包括：

- 生命周期资源对称、幂等销毁和框架卸载保护。
- Store 原子 insert/upsert/replace 契约及空间索引一致性。
- 领域无关的 instance mask 解码、注入映射、错误模型和 OpenCV 资源释放。
- 类型化事件、拖动事务、最终/临时更新边界。
- annotations、selection、layers、spatial、geometry、history、events、tools façade。
- AnnotationInput、layerId、normalization、patch 和只读快照。
- Layer、Spatial、Geometry 的完整通用契约。
- manager 注入与病理耦合 usage audit，并据证据整理正式扩展边界。
- Viewer、Pixi、React、Svelte、loader、history、package consumer 的真实集成测试。
- 框架独立根入口，React/Svelte/tools/loaders/styles 子入口及兼容代理。
- 最小与完整 PR CI、package consumer 门禁。
- README、用户文档、迁移与贡献文档同步。
- 建立可复现 benchmark；若无法形成可信数字，则删除未经验证的性能承诺。
- 文档站 chunk/sitemap 整理。

兼容策略严格遵循分析文档第 6.8 节：不得删除现有扁平 API、根入口 React 导出、
旧事件或旧样式入口。旧入口只能代理到新实现并附带明确 deprecated 信息。

## Context

- `docs/INDEX.md`
- `docs/plan/README.md`
- `docs/plan/analysis/annota-refactoring.md`
- `README.md`
- `CONTRIBUTING.md`
- `PUBLISHING.md`

分析文档是行为、领域边界和验收事实源。若代码现状与目标设计存在差异，实现目标
设计并保留文档要求的兼容层；不要引入文档未授权的 silent fallback。

## Path

允许修改：

- `src/**`
- `test/**`
- `examples/**`
- `benchmarks/**`
- `fixtures/**`
- `scripts/**`
- `.github/workflows/**`
- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `vitest.config.ts`
- `svelte.config.js`
- `README.md`
- `CONTRIBUTING.md`
- `PUBLISHING.md`
- `docs/**`

不得提交生成目录或依赖目录：

- `node_modules/**`
- `dist/**`
- `.svelte-kit/**`
- `docs/node_modules/**`
- `docs/dist/**`
- `docs/.astro/**`

不得进行与重构目标无关的全仓格式化或目录重排。

## Implementation discipline

- 先完整实现所有目标，再统一执行开发侧检查；不要按 001—016 分批 review。
- 所有公共写路径共用一条 command/transaction/normalization 管线。
- 公共返回值是只读快照；外部输入不能污染 Store 或 SpatialIndex 内部状态。
- 浏览器、WebGL、OpenCV 边界可以使用受控 fake；核心与跨模块连接优先使用真实实现。
- 所有第三方无类型数据必须在 adapter 边界验证，核心不得扩散 `any`。
- 所有错误、可选缺失与 fallback 遵循明确契约，并测试错误分支。
- 发现基线中的无关问题时不要顺手扩大范围；仅修复阻塞本任务验证的问题。

## Verification

全部实现完成后，开发侧一次性运行并修复至通过：

```bash
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm --dir docs build
pnpm pack --pack-destination <临时目录>
```

还必须：

- 运行新增的 browser 生命周期、React/Svelte 集成、consumer fixture 和 benchmark
  回归命令。
- 验证 `annota`、`annota/react`、`annota/svelte`、`annota/tools`、
  `annota/loaders`、`annota/styles.css` 的 ESM/CJS/类型/CSS 消费路径。
- 断言分析文档第 7.4 节列出的每项关键行为。
- 检查生成 tarball 不包含源码外的缓存、测试产物或依赖目录。

完成后提交全部源代码、测试、CI 与文档改动。不要提交构建产物。
