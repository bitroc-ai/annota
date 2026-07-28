---
id: refactor-all
status: blocked
reviewed-at: 2026-07-27
commit: 8f0f4096cf8b17cca6fb828e6fd414a963ac4d8e
---

# Annota 1.0 一次性重构第三轮独立验证

## Findings

1. **P1 · blocking — “独立 custom manager 通过共享 contract suite”仍是假阳性，测试实现与正式合同至少有三处可复现分歧。**

   - 设计位置：`docs/plan/analysis/annota-refactoring.md:519-534,730` 和
     `docs/plan/tasks/refactor-all.md:27,87-90`。正式 manager 扩展点必须定义并测试
     生命周期、错误行为和完整契约；独立自定义实现必须通过与内置实现相同的共享 suite，
     同 `zIndex` 必须保持稳定创建顺序。
   - 本轮已不再使用内置 manager 的 Proxy，而且
     `test/integration/browser-lifecycle.test.ts` 会把四个独立 manager 实例真实注入
     Annotator。这关闭了第二轮 finding 的“没有独立实现、没有真实注入”部分。
   - 但 `test/core/manager-contracts.test.ts:21-100` 的所谓共享 suite 只检查简单
     CRUD、observer、不同 z-index 排序和 history happy path，没有覆盖文档明确要求的
     错误、批处理原子性或同 z-index 稳定性。独立实现因此虽然通过测试，却与内置实现/
     正式合同直接冲突：
     - `test/helpers/custom-managers.ts:83-97` 的 `replaceAll` 遇到批内重复 ID 会静默
       后写覆盖；内置 Store 在 `src/core/store.ts:116-149` 先拒绝重复并保持原子性。
       原分析 §5.2 明确要求批内重复 ID 行为写入测试。
     - `test/helpers/custom-managers.ts:104-109` 的 `update(id, input)` 会把不一致的
       `input.id` 静默改写为参数 `id`；内置 Store 在
       `src/core/store.ts:164-169` 抛出 `AnnotationValidationError`。
     - `test/helpers/custom-managers.ts:260-263` 对相同 z-index 追加
       `id.localeCompare`，会按 ID 重排；内置 LayerManager 在
       `src/core/layer.ts:240-243` 依赖稳定排序保持创建顺序，符合分析 §6.4。
   - 这不是测试实现的无关细节：当前 suite 会认证一个无法替换内置 manager 的实现，
     外部扩展作者也无法从该 suite 得到承诺的兼容性保证。必须把错误/原子性/稳定序等正式
     行为纳入真正可复用的共享 contract suite，并让独立实现与内置实现共同通过。

## 第二轮 7 项关闭情况

| # | 第三轮结果 | 验证摘要 |
| --- | --- | --- |
| 1 | closed | 发布版本为 1.0.0；原分析/任务中的历史 minor 约束已恢复。新 ADR 只解释原子 major 交付，没有改写历史事实；root 框架中立，`legacy-react` 完整代理旧根 surface。packed root/React/legacy React/Svelte consumer 均通过。 |
| 2 | closed | `state` 是独立、冻结、只含查询/观察能力的 readonly wrapper；与 `unsafeState` 对象不同，类型和运行时均不暴露 store/history 写方法。 |
| 3 | closed | Split 预览、提交和取消统一使用 tool transaction；真实集成测试验证 transient preview、单个 transaction、一次 undo、undo 恢复和 cancel 不留历史。 |
| 4 | partial / blocked | 已有独立 manager 和真实 Annotator 注入，但共享 contract suite 不完整且独立实现实际违反 Store/Layer 正式契约，见 finding 1。 |
| 5 | closed | 非 click drag 在 release 命中另一 annotation 时仍先提交被拖对象；交叠测试验证最终 update 只属于移动对象且 undo 可恢复。 |
| 6 | closed | OpenCV 主资源改为逐项可选分配并在 `finally` 逆序释放；测试覆盖 contours/hierarchy 构造抛错，先前分配对象均只删除一次。 |
| 7 | closed | packed `legacy-react.d.ts` 和 `.d.cts` 均保留逐导出 `@deprecated Since 1.0.0`、替代入口和 2.0.0 删除计划；声明同时包含旧 React 名及完整 neutral/tools/loaders surface。 |

## 验证记录

在指定 commit 上执行：

- 定向 manager、browser、mask、tool 测试：4 files / 30 tests 通过。
- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：15 files / 125 tests 通过。
- `pnpm build`：通过；检查生成的 ESM/CJS、`legacy-react.d.ts` 和
  `legacy-react.d.cts`。
- `pnpm test:consumer`：通过；packed tarball 的隔离 root-only、React、legacy React、
  Svelte 和 utilities consumer 均完成真实 load、typecheck 和 Vite build。
- `pnpm test:browser`：1 file / 9 tests 通过。
- `pnpm test:frameworks`：2 files / 2 tests 通过。
- `pnpm benchmark:ci`：通过；1k load 20.48 ms / update 15.71 ms，
  10k load 95.50 ms / update 12.46 ms。
- `pnpm --dir docs build`：通过；47 pages、Pagefind 和 sitemap 生成。
- `git diff --check`：通过。

## 结论

**blocked**

第二轮 7 项中的 6 项已完整关闭，兼容 ADR 也合理地记录了 1.0 原子 major 决策而没有
覆盖原始历史约束。唯一剩余阻断项是 manager 扩展合同：虽然新增了独立实现和真实注入，
当前共享 suite 会错误认证与内置 Store/Layer 行为不一致的实现，因此分析文档 §5.8、
§6.4 和任务完成定义仍未满足。
