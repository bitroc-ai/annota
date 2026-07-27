---
id: refactor-all
status: blocked
reviewed-at: 2026-07-27
commit: 4b48f7341b941685eb37401369e44b2610ce87b5
---

# Annota 1.0 一次性重构第二轮独立验证

## Findings

1. **P1 · blocking — 修复提交改写了原始兼容合同，并实际删除了根入口 React API。**

   - 用户指定的原始分析文档和任务明确要求兼容小版本“不得删除根入口 React 导出”，
     旧入口只能代理到新实现。该要求也已在第一轮 review 的 commit
     `bb6917000ea7e95bccc99e4056865802a4f7b55c` 中固定。
   - 本轮没有实现该代理，而是同时修改事实源：
     `docs/plan/analysis/annota-refactoring.md:98-101,583-586,861-864` 和
     `docs/plan/tasks/refactor-all.md:35-37` 被改成允许把根 React API 移到
     `annota/legacy-react`；`src/index.ts` 随后删除所有 React export，
     `package.json:64-68` 新增另一条 subpath。
   - 这会让现有 `import { Annotator, createAnnotationStore } from "annota"` 在小版本升级后
     直接类型/构建失败。`src/legacy-react-entry.ts:1-5` 只重导出 `react-entry`，
     也不是旧根入口的完整代理：构建后的 `dist/legacy-react.d.ts` 不包含
     `createAnnotator`、`createAnnotationStore`、tools 或 loaders。
   - 根入口不再加载 optional React peer、隔离 consumer 能通过，属于技术目标的实质修复；
     但不能通过在 fix commit 中改写用户指定的分析/任务合同来消除 breaking change。
     若确实要改变该兼容策略，需要用户明确批准；否则必须保留旧根导出兼容行为。

2. **P1 · blocking — `annotator.state` 不是只读兼容视图，仍公开完整可写 manager 并绕过唯一写入管线。**

   - 设计位置：`docs/plan/analysis/annota-refactoring.md` §5.6、§5.9、§6.3、§6.8、§9；
     `docs/plan/tasks/refactor-all.md:85-90`（公共写路径必须共用
     command/transaction/normalization；`state` 只能保留只读兼容视图）。
   - 代码位置：`src/adapters/openseadragon/annotator.ts:83-92` 的 state 类型暴露可写
     `AnnotationStore`、`HistoryManager`、`SelectionManager` 和 `LayerManager`；
     `:1108-1130` 又把同一个 `unsafeState` 对象同时赋给 `unsafeState` 与 `state`。
   - 因此公共调用方仍可执行 `annotator.state.store.add/update/delete`、
     `annotator.state.history.execute` 等写操作；这些操作不经过 façade/history 选择和
     `ChangeContext`，例如直接 `state.store.add` 不产生 undo step，observer 事件只能退化为
     默认 `source: "api"`。源码仅添加 `@deprecated`，没有实现设计要求的只读兼容层。
   - 当前测试没有断言 `state` 无法写入，也没有断言从 `state` 绕过 façade 时被拒绝。

3. **P1 · blocking — `SplitTool` 仍绕过 tool transaction，预览被发送为最终 API 事件。**

   - 设计位置：§5.5、§5.9、§6.3、§6.7、§7.4 `refactor-006/007`、§9
     （所有 tool preview 必须使用 `source: "tool"`、`transient: true`，提交只产生一个
     最终事务/undo step）。
   - 代码位置：`src/tools/split.ts:46-110` 对每一帧 preview 直接调用
     `annotator.state.store.delete/add`；`:325-347` 又直接操作
     `state.history.beginBatch/execute/endBatch` 和旧 `setSelected`，没有使用
     `annotator.tools.beginTransaction()` 或 façade context。
   - 每次移动 split preview 都会产生普通 create/delete 事件，context 由 annotator
     observer 回退为非 transient 的 `source: "api"`；取消也会产生最终 delete。
     这仍然违反“所有公共写路径只有一条副作用管线”，并可能被持久化订阅者当成真实标注。
   - Polygon、Curve、Rectangle、Push 和 `usePopup` 的主要写路径已接入新事务/facade，
     但没有覆盖 Split 的真实集成测试，因此第一轮 finding 4 只得到部分关闭。

4. **P1 · blocking — manager “custom adapter” 测试仍是内置实现的 Proxy，未验证正式自定义实现或 Annotator 注入链。**

   - 设计位置：§5.8、§5.9、§7.4 `refactor-005/012`、§9
     （正式扩展点须有共享 contract suite；独立 custom manager 必须通过同一 suite；
     必须验证 Custom Manager → Annotator）。
   - 代码位置：`test/core/manager-contracts.test.ts:9-16` 的 `customManager` 只是把
     `createAnnotationStore/createLayerManager/createSelectionManager/createHistoryManager`
     返回的内置对象包装为 Proxy 并 bind 方法；`:23-97` 对 built-in 和该 Proxy 重跑
     相同局部断言。
   - Proxy 仍执行完全相同的内置类/闭包，无法证明 adapter 只依赖公开 capability，
     也无法捕获自定义实现的观察、错误、批处理和生命周期差异。该文件没有导出可复用的
     shared suite，且没有把所谓 custom manager 注入
     `createOpenSeadragonAnnotator`；browser integration 仍只注入一次内置
     `SelectionManager`（`test/integration/browser-lifecycle.test.ts:80-91`）。
   - 真实 OpenSeadragon/canvas、framework 生命周期和 façade → store/history/event/render
     链本轮已经补齐，但 manager contract 这一明确验收项仍未完成。

5. **P2 · blocking — annotation drag 在“释放命中另一标注”分支仍会留下未提交的 transient 位移。**

   - 设计位置：§5.5、§5.9、§7.4 `refactor-006`、§9（每次拖动必须 commit 一次或恢复
     原值，不能停留在 transient 状态）。
   - 代码位置：`src/adapters/openseadragon/annotator.ts:780-784` 先把 release 坐标作为
     transient preview 写入 Store；`:792-814` 若 `hitOnRelease` 是不同 annotation，
     第一分支只切换 selection，跳过后续 history commit；`:820-821` 随即丢弃
     `pressState`。
   - 当被拖标注与另一标注在 release 点重叠、`getAt` 返回另一标注时，被拖标注的新位置
     永久保留，但没有最终 update 和 undo step。新增测试覆盖了“release 快于 RAF”和
     “坐标转换失败恢复”，没有覆盖该交叠分支。

6. **P2 · blocking — OpenCV 主资源在构造阶段抛错时仍有释放缺口。**

   - 设计位置：§5.3、§7.4 `refactor-003`、§9（所有 `Mat`/`MatVector`/contour/approx
     在成功和错误路径均必须对称释放）。
   - 公开兼容 loader 已改走
     `loadInstanceMask`/`instanceRegionsToAnnotations`，正常路径以及
     `approxPolyDP` 抛错路径的 contour/approx/source/vector/hierarchy 都会释放；
     新测试也真实经过该公开入口。这关闭了第一轮发现的主要泄漏。
   - 但 `src/loaders/instance-mask.ts:190-193` 在进入 `try/finally` 之前依次构造
     `source`、`contours` 和 `hierarchy`。若 `new cv.MatVector()` 抛错，已分配的
     `source` 不会删除；若第三个 `new cv.Mat()` 抛错，前两个对象都不会删除。
     `test/loaders/instance-mask.test.ts:82-152` 只在所有主对象构造成功后让
     `approxPolyDP` 抛错，未覆盖 allocation-time failure。

7. **P2 · blocking — `annota/legacy-react` 的 deprecation JSDoc 没有进入发布类型声明。**

   - 设计位置：§6.8、§9（每个 deprecated API/入口均须在类型层提供替代、首次废弃版本
     和计划删除版本）。
   - `src/legacy-react-entry.ts:1-5` 把 `@deprecated` 写成文件级注释后执行
     `export *`；`pnpm build` 生成的 `dist/legacy-react.d.ts` / `.d.cts` 只包含一条
     展开的 export 列表，注释完全丢失，编辑器和类型消费者不会看到该入口已废弃。
   - Flat annotator API、mask polarity helpers、`bounds` 和 `getIntersecting` 的
     `@deprecated` 已成功进入生成声明，故第一轮 finding 10 也是部分关闭而非完全关闭。

## 第一轮问题关闭情况

| # | 第二轮结果 | 验证摘要 |
| --- | --- | --- |
| 1 | closed | nested object/array 深 clone + deep freeze；原输入和返回快照 mutation 均被测试拒绝。 |
| 2 | partial / blocked | packed root ESM/CJS 在不安装 React/Svelte 时真实加载、类型检查和 Vite build 通过；但通过删除原根 React API并改写任务合同实现，见 finding 1。 |
| 3 | closed | Polygon/Curve 用可规范化的 open freehand 做一点评预览，最终再转 polygon；真实 façade 测试通过。 |
| 4 | partial / blocked | Polygon/Curve/Rectangle/Push 与 Popup 主写路径已接入 transaction/facade；`state` 与 Split 仍绕过，见 findings 2、3。 |
| 5 | closed | 真实 Pixi display object 按 layer z-index/稳定序重排；image alpha 正确组合 shape 与 layer opacity，默认 1。 |
| 6 | partial / blocked | 公开 loader 的常规 success/error disposable 已关闭；构造阶段错误仍泄漏，见 finding 6。 |
| 7 | partial / blocked | fast-release 会同步 flush，坐标转换失败会恢复；交叠命中另一标注仍留下 transient，见 finding 5。 |
| 8 | partial / blocked | 已增加真实 OSD viewer/canvas 与真实 React/Svelte annotator lifecycle；manager suite 仍不是真实 custom integration，见 finding 4。 |
| 9 | closed | CI/publish 均安装 docs 依赖并运行完整门禁；按 CI 顺序的 fresh frozen install + root/docs build 通过。 |
| 10 | partial / blocked | flat API 等生成声明已有 deprecation；legacy-react 入口元数据丢失，见 finding 7。 |

## 验证记录

在指定 commit 上执行：

- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：15 files / 119 tests 通过。
- 定向 Store、tools、browser/framework、Pixi、manager、mask 测试：15 files /
  119 tests 通过。
- `pnpm build`：通过；检查生成的 ESM/CJS 和 `.d.ts` / `.d.cts`。
- `pnpm test:browser`：1 file / 5 tests 通过；包含真实 OpenSeadragon viewer 与 canvas。
- `pnpm test:frameworks`：2 files / 2 tests 通过；React/Svelte 使用真实 annotator/OSD，
  仅 WebGL/Pixi 边界为受控 fake。
- `pnpm test:consumer`：通过；隔离的 root-only、React-only、Svelte-only 和 utilities
  fixture 对 packed tarball 做了真实 ESM/CJS load、typecheck 和 Vite build。
- `pnpm benchmark:ci`：通过；1k load 21.05 ms / update 17.40 ms，
  10k load 116.51 ms / update 13.02 ms。
- fresh archive 按 CI 顺序执行根 `pnpm install --frozen-lockfile`、`pnpm build`、
  docs `pnpm install --frozen-lockfile`、docs build：通过，47 pages 和 sitemap 生成。
- `git diff --check`：通过。仓库没有 `lint` script，`pnpm lint` 不可用，不计为任务门禁。

## 结论

**blocked**

本轮关闭了多数第一轮运行时回归，新增的真实 consumer、OSD/framework、Pixi 和 mask
验证也明显提升了可信度。但实现仍通过改写用户给定事实源引入根入口 breaking change，
同时 `state`、SplitTool 和 custom manager 三条核心扩展/写入合同没有闭环；drag、
OpenCV allocation failure 和 legacy entry 类型废弃元数据也仍有明确错误路径。
在这些 blocking findings 修复或兼容策略得到用户明确批准前，该 commit 不能交付。
