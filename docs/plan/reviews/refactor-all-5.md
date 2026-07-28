---
id: refactor-all
status: blocked
reviewed-at: 2026-07-27
commit: f8a2e2a92c4a8647fa9a1b1b80ac9ddec669444d
---

# Annota 1.0 一次性重构第五轮独立验证

## Findings

1. **P1 · blocking — Layer snapshot 实现已修复，但共享 contract 只验证 created event，仍会认证泄漏 update/reordered/deleted payload 的 custom manager。**

   - 设计位置：`docs/plan/analysis/annota-refactoring.md:519-534,712-750,1041-1057`；
     `docs/plan/tasks/refactor-all.md:85-89`。正式 manager 的所有公共返回/事件边界必须
     形成同一份可复用合同，外部不能通过任何事件 payload 修改内部状态。
   - `src/core/layer.ts:12-87` 已把 `Layer`、`LayerChangeEvent` 和集合返回类型改为
     readonly；`:49-62,125-129,136-163,231-260` 对 create/get/list/routed 和统一
     event emit 均返回 frozen detached snapshot。独立实现也使用统一 snapshot helper。
     直接探针确认当前内置实现的 created、updated、reordered、deleted 四类事件都冻结，
     所以第四轮报告的运行时泄漏本身已关闭。
   - 但 `test/contracts/manager-capability-contracts.ts:305-360` 名为“every read and
     observer boundary”的共享测试只在 observer 注册后调用一次 `createLayer()`，
     然后只检查 `observer.mock.calls[0][0]`。它从未产生或检查 update、reordered 或
     deleted event 的对象、`layers` 数组和元素。
   - 因此一个“created event 冻结、update event 仍返回内部对象”的自定义实现仍会通过
     全部共享 suite。第四轮要求的 create/update event 运行时隔离尚未由 contract
     强制，README 中“frozen snapshot isolation”的兼容门禁仍是假阳性。

2. **P1 · blocking — 成功 merge 不清空已有 redo 分支，可重新执行已被新命令废弃的历史。**

   - 设计位置：`docs/plan/analysis/annota-refactoring.md:519-534,709-710,1041-1057`；
     `docs/plan/tasks/refactor-all.md:85-89`。一次新写入必须产生一致的 history 状态；
     新命令执行后，旧 redo 分支必须失效，无论该命令是新建 undo step 还是合并到旧 step。
   - `src/core/history.ts:344-365` 现在先执行新 command，再尝试 merge，正确关闭了
     “失败 execute 污染 merge candidate”的第四轮 finding。但 merge 成功分支
     `:348-353` 在清空 `redoStack` 的 `:364-365` 之前直接 return。
     独立实现 `test/helpers/custom-managers.ts:469-479` 有相同行为。
   - 共享测试把两项语义拆开后遗漏了组合：
     `test/contracts/manager-capability-contracts.ts:601-615` 只在
     `enableMerging: false` 时验证新命令清 redo；`:618-641` 的成功 merge 用例没有先
     建立 redo 分支。
   - 当前内置实现可复现：执行可合并命令 A，再执行独立命令 B，undo B 后执行并成功
     合并命令 C。此时状态为 `3`、undo size 为 `1`，但 redo size 仍为 `1` 且
     `canRedo()` 为 true；继续 redo 会重新执行已废弃的 B，使状态变成 `13`。
     这违反现有 suite 自己声明的“new command clears redo”合同，并说明成功 merge
     语义尚未完整验证。

## 第四轮两个 P1 关闭情况

| # | 第五轮结果 | 验证摘要 |
| --- | --- | --- |
| 1 | partial / blocked | 内置/custom 的类型和实际 snapshot 实现已一致；create/get/all/visible/ordered/routed 返回值以及四种内置事件均为 frozen detached snapshot。共享 suite 仍只验证 created event，见 finding 1。 |
| 2 | closed | 新 command 在 merge callback 前执行；失败时 merge 不被调用，state/undo/redo/observer 不变，随后 undo 正确恢复。built-in/custom 原样通过新增失败 contract。成功 merge 与 redo 的组合另有阻断错误，见 finding 2。 |

## 其他回归检查

- 四个 `define*Contract` 仍只接收公共 capability factory，并由
  `test/core/manager-contracts.test.ts:18-34` 对 built-in/custom 原样注册。
- `test/integration/browser-lifecycle.test.ts:183-220` 仍真实注入四个独立 manager，
  façade、normalization、layer、selection、typed events、history 和 undo 链通过。
- Store、Selection 以及兼容 1.0/legacy entry、readonly state、Split transaction、
  drag overlap、OpenCV 清理和 packed declaration deprecation 未见回归。

## 验证记录

在指定 commit 上执行：

- 定向 manager contracts、Layer、History 和 browser integration：4 files /
  99 tests 通过。
- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：15 files / 167 tests 通过。
- `pnpm build`：通过；packed 声明包含 readonly `Layer`、readonly layer 集合和事件类型。
- `pnpm test:consumer`：通过；隔离 root/React/legacy React/Svelte/tools/loaders
  consumers 均完成 load、typecheck 和 Vite build。
- Layer runtime probe：create/get/routed/all/visible/ordered 均冻结；created、updated、
  reordered、deleted 事件的 event、数组和元素均冻结。
- History failed-execute probe：`state=1, undo=1, redo=0, mergeCalls=0,
  observer=0`；undo 后状态恢复为 `0`。
- History successful-merge-with-redo probe：merge 后
  `{"value":3,"undo":1,"redo":1,"canRedo":true}`；继续 redo 后 value 变为 `13`。
- `git diff --check`：通过。

## 结论

**blocked**

第四轮两个具体运行时错误中，Layer 内部对象泄漏和 failed execute 污染 merge
candidate 均已修复，公共类型、packed 声明和两个 bundled manager 也已对齐。但共享
Layer suite 仍未覆盖非 created 事件，History 成功 merge 又会保留废弃 redo 分支。
这两项都属于正式 manager 的可观察合同，故当前提交仍不能交付。
