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

- 深层 properties 快照、Store/Spatial 原子性与 R-tree update 性能。
- tool/drag transient transaction、单次 history 与取消恢复。
- Layer/Pixi 稳定顺序、透明度、只读快照和四类事件隔离。
- instance mask 通用解码、typed errors 与 OpenCV 全异常路径释放。
- 只读 `state`、独立 custom managers 与共享 capability contract suite。
- framework-neutral 1.0 根入口、完整 `legacy-react` 迁移入口与类型级废弃信息。
- 真实 OpenSeadragon/Pixi/React/Svelte 生命周期、隔离 packed consumer 和 fresh CI。
- History execute/merge 的失败原子性、redo 清理和 observer 语义。

独立 verify 共进行六轮；前五轮的 blocking findings 均在同一交付分支修复，第六轮
结论为 `pass`，没有遗留 blocking 或 non-blocking finding。包按原子交付 ADR 升级为
`1.0.0`：根入口保持 framework-neutral；原根入口的 React 消费面由完整的
`annota/legacy-react` 迁移代理承接，并计划在 2.0 删除。

## 验证结果

| 门禁 | 结果 |
| --- | --- |
| `pnpm typecheck` | 通过 |
| `pnpm exec vitest run` | 15 files，169 tests 通过 |
| `pnpm build` | ESM、CJS、DTS、CSS、Svelte 通过 |
| `pnpm --dir docs build` | 47 页、Pagefind 与 sitemap 通过 |
| `pnpm test:browser` | 9 tests 通过 |
| `pnpm test:frameworks` | React/Svelte 2 tests 通过 |
| `pnpm test:consumer` | 6 类隔离 packed consumer 的 ESM/CJS/TS/Vite 均通过 |
| Manager capability contracts | 内置与独立实现共用 52 项，全部通过 |
| `pnpm benchmark:ci` | 1k/10k 固定 seed 通过宽松回归阈值 |
| Fresh CI | 根/docs frozen install、全部门禁与文档构建通过 |

最后一次 benchmark 样本：

| 数量 | load | query P95 | 1000 updates |
| ---: | ---: | ---: | ---: |
| 1,000 | 环境相关 | 环境相关 | 通过 CI 阈值 |
| 10,000 | 环境相关 | 环境相关 | 通过 CI 阈值 |

这些数字只描述 Node 核心回归 workload，不作为浏览器 FPS 或硬件承诺。
