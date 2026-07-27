---
id: refactor-all
status: passed
reviewed-at: 2026-07-27
---

# Annota 1.0 一次性重构验证

## Review 结论

实现完成后统一检查了生命周期、Store/Spatial 原子性、normalization、typed events、
drag transaction、分域 façade、Layer/Geometry、instance mask、框架生命周期、
package exports、CI、benchmark 和文档。阻塞发现均已在同一交付中修复：

- typed event 与泛型 properties 的声明打包边界。
- 旧 ignored `src/**/*.d.ts(.map)` 生成物遮蔽新 TypeScript 源文件。
- React/Svelte lifecycle 测试的真实浏览器条件与异步卸载时序。
- Store 单条 update 重建完整 R-tree 导致的 benchmark O(n²) 路径。
- packed consumer 应使用 browser production build 验证 OpenSeadragon 入口。
- 文档站单一大 chunk 和缺失 sitemap 配置。

没有遗留 blocking finding。根入口 React 导出按兼容策略保留；规范 framework-independent
核心能力另有 `annota/core`，React/Svelte/tools/loaders/styles 均有独立入口。下一主
版本可按迁移指南移除根入口 React 兼容导出。

## 验证结果

| 门禁 | 结果 |
| --- | --- |
| `pnpm typecheck` | 通过 |
| `pnpm exec vitest run` | 13 files，104 tests 通过 |
| `pnpm build` | ESM、CJS、DTS、CSS、Svelte 通过 |
| `pnpm --dir docs build` | 47 页通过；生成 `sitemap-index.xml`；无 >500KB chunk 告警 |
| `pnpm test:browser` | 2 tests 通过 |
| `pnpm test:frameworks` | React/Svelte 2 tests 通过 |
| `pnpm test:consumer` | packed tarball 安装、ESM/CJS resolve、Vite production build 通过 |
| `pnpm benchmark:ci` | 1k/10k 固定 seed 通过宽松回归阈值 |
| `pnpm pack --pack-destination <temp>` | 通过；无 test、依赖或构建缓存目录 |

最后一次 benchmark 样本：

| 数量 | load | query P95 | 1000 updates |
| ---: | ---: | ---: | ---: |
| 1,000 | 19.49 ms | 0.027 ms | 12.74 ms |
| 10,000 | 78.34 ms | 0.009 ms | 11.69 ms |

这些数字只描述 Node 核心回归 workload，不作为浏览器 FPS 或硬件承诺。
