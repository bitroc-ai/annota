---
id: refactor-all
status: blocked
reviewed-at: 2026-07-27
commit: bb6917000ea7e95bccc99e4056865802a4f7b55c
---

# Annota 1.0 一次性重构独立验证

## Findings

1. **P1 · blocking — `properties` 的嵌套值仍与 Store 共享引用，公共快照可以绕过写入管线修改内部状态。**

   - 设计位置：`docs/plan/analysis/annota-refactoring.md` §5.6、§5.7、§6.6、§9
     （外部输入不能污染 Store；公共返回值必须是只读快照；稳定写入只能经过 façade）。
   - 代码位置：`src/core/normalization.ts:166-167` 只浅复制 `properties`，
     `src/core/normalization.ts:174-196` 也只冻结顶层对象；
     `test/core/store.test.ts:17-29` 所谓“外部 mutation 隔离”测试把 `nested`
     设为字符串，没有覆盖嵌套对象或数组。
   - 实际结果：向 Store 写入 `{ properties: { meta: { label: "before" }, tags: ["a"] } }`
     后，修改原输入的 `meta.label`，或修改 `store.get()` 返回值中的
     `meta.label` / `tags`，后续 `store.get()` 都会看到变更，且不会产生 history、
     event 或 spatial 同步。这直接破坏只读快照和单一写路径 contract。

2. **P1 · blocking — 根入口不是 framework-independent，optional peer 和 consumer 门禁均为假阳性。**

   - 设计位置：§5.10、§6.1、§7.4 `refactor-012/013`、§9
     （根入口不得静态导入 React/Svelte；无关框架不应被强制安装；每个子入口必须有
     独立最小 consumer）。
   - 代码位置：`src/index.ts:80-153` 从根入口静态重导出 React 实现，
     `tsup.config.ts:3-15` 将 React externalize；
     `package.json:82-97` 又把 React/ReactDOM 标为 optional；
     `src/svelte/components/annotator.svelte:4-8` 的 Svelte 运行时代码反过来从根
     `annota` 导入 annotator；
     `scripts/test-package-consumers.mjs:23-36` 在同一个 fixture 中一次装齐 React
     和 Svelte，`scripts/test-package-consumers.mjs:39-54` 对 ESM/CJS 只执行
     `import.meta.resolve` / `require.resolve`，并未加载导出。
   - 实际结果：从指定 commit 打出的 tarball 创建只依赖 `annota`、
     `openseadragon` 和 Vite 的最小项目，并按 README 从 `annota` 导入
     `createAnnotator`，production build 失败，报告 72 个
     `__vite-optional-peer-dep:react:annota` missing export。当前 consumer 脚本因为
     预装了所有 optional peers 而通过，不能证明根、Svelte 或 core-only 消费边界。

3. **P1 · blocking — 新 normalization 使 PolygonTool 和 CurveTool 的真实首次写入立即失败，现有工具测试用 mock 遮蔽了回归。**

   - 设计位置：§3.1、§5.9、§7.4 `refactor-010/013`、§9
     （不破坏现有标注工作流；tools 必须经过真实 façade → Store 链路验证）。
   - 代码位置：`src/core/normalization.ts:83-91` 拒绝少于 3 点的 polygon；
     `src/tools/polygon.ts:121-155` 在第一个点时创建一点评 polygon 并调用
     `addAnnotation`；`src/tools/curve.ts:56-81` 做相同操作；
     `src/adapters/openseadragon/annotator.ts:969-975` 将旧入口代理到会执行
     normalization 的 façade。
     `test/tools/polygon.test.ts:24-40` 则用无验证的 mock store/annotator，
     因而测试仍然通过。
   - 结果是用户第一次点击 Polygon/Curve 就会得到
     `AnnotationValidationError("polygon requires at least three points")`，无法开始绘制。

4. **P1 · blocking — tools 和公开 React hook 仍绕过统一 command/transaction 管线；绘制预览被当作最终 API 更新并产生多条 history。**

   - 设计位置：§5.5、§5.6、§6.3、§6.7、§7.4 `refactor-006/007`、§9
     （tool 预览必须 `source: "tool"`、`transient: true`，最终只生成一个 undo step；
     所有公共写入只有一条副作用管线）。
   - 代码位置：`src/tools/rectangle.ts:88-124` 每次 drag 都调用旧
     `updateAnnotation`；`src/tools/polygon.ts:165-187` 和
     `src/tools/curve.ts:84-108` 同样把预览写成普通更新；
     `src/adapters/openseadragon/annotator.ts:982-984` 把这些调用固定标为
     `source: "api"`，`src/adapters/openseadragon/annotator.ts:243-249` 又关闭 history
     merge。`src/tools/push.ts:170-223` 更直接逐帧写
     `unsafeState/state.store`，没有 history，Store observer 会把它当成非 transient
     的 API 事件。公开 `usePopup` 的 update/delete 也直接写 Store：
     `src/react/hooks/use-popup.ts:135-169`。
   - 因此一次 Rectangle/Polygon/Curve 交互会产生 N 个最终持久化事件和 N 个 undo
     step；Push 和 Popup 修改则绕过 façade/history。`tools` façade 目前只暴露
     `active`（`src/adapters/openseadragon/annotator.ts:166-168`），没有可供工具共享的
     transient/final transaction 写入能力。

5. **P1 · blocking — Layer 的 z-index 和 image opacity contract 没有接入真实 Pixi 渲染。**

   - 设计位置：§6.4、§7.4 `refactor-007/010`、§9
     （小 z-index 先绘制；同 z-index/同层顺序稳定；layer opacity 必须与
     fill/stroke/image opacity 相乘，未设置 opacity 按 1）。
   - 代码位置：`src/rendering/pixi/stage.ts:269-290` 始终按 annotation 插入顺序
     `addChild`；`src/rendering/pixi/stage.ts:803-839` 的 layer change 只更新
     visibility/opacity，整个文件没有读取 `zIndex` 或重排 child。
     `src/rendering/pixi/stage.ts:395-430` 虽计算了 layer-adjusted `finalStyle`，
     但 `src/rendering/pixi/shapes.ts:445-473` 的 `renderImage` 完全忽略 style，
     只把 sprite alpha 设为 `shape.opacity ?? 0.6`。
   - 所以 `setLayerZIndex` 不改变绘制顺序；image layer opacity 不生效，未设置的 image
     opacity 也错误地是 `0.6` 而不是 `1`。现有测试只有 LayerManager 单元状态，
     没有跨 Pixi 的行为断言。

6. **P1 · blocking — 公开兼容 mask loader 的 8/16-bit OpenCV 路径仍泄漏资源，异常路径也没有 `finally` 清理。**

   - 设计位置：§5.3、§7.4 `refactor-003`、§9
     （所有 `Mat`、`MatVector`、`approx` 和 `contours.get(i)` 返回对象必须释放，
     且 OpenCV 失败/释放必须有测试）。
   - 代码位置：`src/loaders/masks.ts:130-216`、`:260-322` 和 `:426-497`
     中每次 `contours.get(i)` 得到的 contour 都未调用 `delete()`；矩阵和 vector
     只在 happy path 末尾释放，没有 `try/finally`，`continue` 和 OpenCV 抛错都会
     留下资源。`test/loaders/instance-mask.test.ts:9-73` 只测试新 loader 的纯 decoder
     和注入的 fake `extractContours`，未经过这些兼容路径，也未断言任何 OpenCV
     disposable 的释放。
   - 新 `loadInstanceMask` 的局部实现虽使用了 `finally`，但旧
     `loadMaskPolygons` 仍是公开兼容入口，并继续把 binary/instance8/instance16
     路由到上述未修复实现，因此完成定义中的“错误与资源释放”尚未达成。

7. **P2 · blocking — annotation drag 的取消/边界路径可永久保留 transient 状态，快速 release 还会丢失尚未执行的 drag frame。**

   - 设计位置：§5.5、§7.4 `refactor-006`、§9
     （取消拖动必须恢复原 annotation 且不产生最终事件；release 必须提交一次最终更新）。
   - 代码位置：`src/adapters/openseadragon/annotator.ts:623-655` 把实际位移延迟到
     RAF；`src/adapters/openseadragon/annotator.ts:692-705` 只在
     `preventDefaultAction` 分支恢复原值；`:716-720` 在坐标转换失败时直接清空
     `pressState`，不恢复已写入的 transient annotation；`:728-757` 在普通 release
     也不 flush/cancel 待执行的 drag RAF。
   - 因此 release 时若 `pointerEventToImage` 返回空，Store 会停留在最后一次 transient
     preview 且没有 history/final event；若 release 先于 RAF，用户最后一段位移被丢弃。
     当前测试没有触发任何 press/drag/release handler。

8. **P1 · blocking — 关键“集成测试”仍是 fake，且正式 manager contract suite、drag、Layer/Pixi 链路均缺失。**

   - 设计位置：§5.8、§5.9、§7.4 `refactor-006/009/010/011/012/013`、§9
     （至少一个真实 OpenSeadragon viewer + canvas 生命周期测试；真实
     façade → Store → history/event/rendering 链；Layer/Spatial/Geometry 渲染交互；
     正式自定义 manager 共享 contract suite）。
   - 代码位置：`test/integration/browser-lifecycle.test.ts:3-21` mock 掉整个 Pixi stage，
     `:31-61` 手写 viewer；测试从未创建 OpenSeadragon viewer，也未运行真实 canvas/WebGL
     生命周期。`test/integration/browser-lifecycle.test.ts:71-140` 只覆盖 destroy
     计数和一次 façade 更新，没有 drag、取消、Layer visibility/opacity/z-index、
     selection/render 或 tool transaction。React/Svelte 测试又分别在
     `test/integration/framework-lifecycle.test.tsx:6-13` 和
     `test/integration/svelte-lifecycle.test.ts:4-12` mock 掉 annotator factory。
     全部测试中只有一个 lifecycle case 注入 `selectionManager`，没有 Store、
     Layer、Selection、History 的共享 custom-manager contract suite。
   - 浏览器/WebGL 边界允许受控 fake，但设计明确额外要求至少一条真实
     OpenSeadragon/canvas 链；当前 `test:browser` 只是 jsdom + fake，不能作为该验收证据。

9. **P1 · blocking — PR CI 在 fresh checkout 必然到 docs build 失败；发布文档声称的完整门禁也没有进入 publish workflow。**

   - 设计位置：§7.3、§8、§9；同时违反 `docs/INDEX.md` 的“用户文档与代码行为一致”。
   - 代码位置：`.github/workflows/ci.yml:20-28` 只在仓库根执行一次
     `pnpm install --frozen-lockfile`，随后直接运行 `pnpm --dir docs build`；
     项目没有 `pnpm-workspace.yaml`，`docs/package.json` 和 `docs/pnpm-lock.yaml`
     是独立依赖树。`PUBLISHING.md:90-96` 声称发布流程运行 browser/framework、
     packed consumer 和 benchmark，但 `.github/workflows/publish.yml:68-78`
     实际只有根 install、typecheck、普通 tests 和 build。
   - 将 `docs/` 复制到不带 `node_modules` 的干净目录并执行与 CI 相同的
     `pnpm --dir <docs> build`，稳定复现 `sh: astro: command not found`。本地 docs
     build 通过仅因为工作区已有 `docs/node_modules`，不能证明 GitHub Actions 门禁可用。

10. **P2 · blocking — 多数兼容 API 没有源码/类型级 deprecation 信息，和迁移策略不一致。**

    - 设计位置：§6.8、§9
      （旧入口只能做代理并带明确 deprecated 信息；每项注明替代、首次废弃版本和计划删除版本）。
    - 代码位置：`src/adapters/openseadragon/annotator.ts:185-230` 只有 `state`
      标了 `@deprecated`，其余 flat annotations/selection/layer/history/events 方法均未标；
      `src/index.ts:80-153` 的根 React 兼容重导出未标；
      `src/core/index.ts:92-97` 的 pathology polarity helpers 也未标，而 usage audit
      声称它们是 deprecated。构建后的 `dist/*.d.ts` 中没有任何 `@deprecated`
      标记。
    - migration guide 提供了一张部分映射表，但不能让编辑器/类型消费者识别每个旧
      API 的废弃版本与替代方案；`addAnnotations`、flat Layer/History/legacy event
      等也没有逐项迁移信息。

## 验证记录

在指定 commit 上执行：

- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：13 files / 104 tests 通过。
- `pnpm build`：通过。
- `pnpm test:browser`：2 tests 通过，但如 finding 8 所述均为 jsdom fake。
- `pnpm test:frameworks`：2 tests 通过，但 factory 被 mock。
- `pnpm test:consumer`：通过，但如 finding 2 所述没有隔离 optional peers，ESM/CJS
  只做 resolve。
- `pnpm benchmark:ci`：通过；1k load 18.80 ms / update 12.29 ms，10k load
  151.69 ms / update 13.96 ms。
- `pnpm --dir docs build`：在当前已有依赖的工作区通过，47 pages 和 sitemap 生成；
  fresh docs 依赖树复现 `astro: command not found`。
- `pnpm pack`：通过，tarball 未包含任务禁止的生成/依赖目录。
- 额外 packed core-only consumer：失败，根入口缺少 optional React 时无法构建。

## 结论

**blocked**

现有绿色测试主要验证了局部实现或受控 fake，未覆盖多条真实用户路径；同时已经复现
工具不可用、快照可变、optional peer 消费失败和 fresh CI 失败。以上 findings 均直接
违反设计 contract 或关键验收，当前 commit 不具备可交付状态。
