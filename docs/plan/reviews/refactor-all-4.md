---
id: refactor-all
status: blocked
reviewed-at: 2026-07-27
commit: 565a9ef93aa61e62b50f3fef7d62cca2c6aa4f8e
---

# Annota 1.0 一次性重构第四轮独立验证

## Findings

1. **P1 · blocking — Layer contract 仍会认证行为不一致的实现，并遗漏可直接修改内置状态的共享引用。**

   - 设计位置：`docs/plan/analysis/annota-refactoring.md:519-534,712-750,1041-1057`；
     `docs/plan/tasks/refactor-all.md:85-89`。正式 manager 必须有完整、共享的行为合同，
     公共返回值必须是只读快照，外部不能绕过更新/事件管线修改内部状态。
   - `test/contracts/manager-capability-contracts.ts:233-342` 已覆盖默认图层、同 z-index
     稳定创建序、控制项、路由、重复/缺失/受保护操作和 observer，但只断言
     `getLayerForAnnotation()` 返回的 ID，没有验证返回对象或事件 payload 的隔离。
   - 内置 `LayerManager` 在 `src/core/layer.ts:215-231` 对显式、filter 和 default 三条
     路径都直接返回 Map 中的内部 `Layer`。调用方执行
     `manager.getLayerForAnnotation(annotation)!.visible = false` 后，
     `manager.getLayer("default")!.visible` 立即变为 `false`，且没有 layer event。
     独立实现 `test/helpers/custom-managers.ts:304-308` 则返回 clone，行为不同。
   - created event 也存在相同分歧：内置实现
     `src/core/layer.ts:125-138` 把内部 `layer` 直接放进事件；observer 修改
     `event.layers[0]` 会污染 Map。独立实现
     `test/helpers/custom-managers.ts:209-233` 在事件中放 clone。
   - 因此当前同一 suite 仍同时放过“返回快照”和“返回内部可写对象”两种不兼容实现，
     第三轮 finding 要求的完整共享合同尚未闭环。

2. **P1 · blocking — History 的失败合同关闭了 merging，合并命令执行失败会破坏已有 undo 记录。**

   - 设计位置：`docs/plan/analysis/annota-refactoring.md:519-534,1041-1057`；
     `docs/plan/tasks/refactor-all.md:85-89`。正式 manager 的错误行为必须形成合同，
     失败不能把历史栈留在与已执行状态不一致的状态。
   - `test/contracts/manager-capability-contracts.ts:491-542` 虽然覆盖普通 execute、
     batch、undo 和 redo 抛错，但 factory 固定使用 `{ enableMerging: false }`。
     `:561-594` 只验证 merging 成功路径，没有组合“merge 成功、随后新命令 execute
     抛错”的失败路径。
   - 内置实现 `src/core/history.ts:344-350` 和独立实现
     `test/helpers/custom-managers.ts:454-458` 都先调用已有 command 的
     `merge(command)`，允许它修改已有 undo command，然后才调用新 command 的
     `execute()`。若 execute 抛错，已有 command 的合并状态不会恢复。
   - 在当前内置实现上可复现：第一个 command 将状态从 `0` 加到 `1`，其 `merge`
     把 undo 总量从 `1` 改为 `3`；第二个 command 的 execute 抛错后再 undo，
     状态从 `1` 变成 `-2`，undo/redo 栈却正常移动。两个实现都会通过现有 suite，
     因而 README 所称的 “failure-safe stacks” 仍未得到保证。

## 第三轮 manager finding 关闭情况

| 验证域 | 第四轮结果 | 验证摘要 |
| --- | --- | --- |
| Suite 复用结构 | closed | 四个 `define*Contract` 均导出并只接收公共 capability factory；built-in 与独立实现由 `test/core/manager-contracts.test.ts:18-34` 原样注册，没有分叉或特判。 |
| Store | closed | 两种实现共同覆盖 normalization、insert conflict、显式/兼容 upsert、replace、批内重复和无效输入原子性、typed errors、事件分类、observer 失败隔离及 update/delete 后空间结果一致性。第三轮指出的重复 ID 和 update ID mismatch 已修复。 |
| Layer | partial / blocked | 同 z-index 稳定序和已知错误路径已覆盖；仍遗漏返回值/事件快照隔离，并实际认证不同实现，见 finding 1。 |
| Selection | closed | 两种实现共同覆盖去重/稳定首序、set/toggle/add/remove/clear、精确 transition、no-op、observer 幂等及异常隔离；内置实现已补齐去重和重复订阅保护。 |
| History | partial / blocked | batch 顺序、disabled、普通失败栈、undo/redo、redo 清理、merging、容量、observer 和空 batch 均覆盖；merging + execute failure 会污染旧记录，见 finding 2。 |
| Custom Manager → Annotator | closed | `test/integration/browser-lifecycle.test.ts:183-220` 仍把四个独立实例真实注入 Annotator，并验证实例身份、façade、normalization、layer、selection、typed events、history 和 undo 链。 |

## 前三轮已关闭项回归

兼容 1.0/legacy entry、readonly state、Split transaction、drag overlap、OpenCV
构造失败清理和 packed declaration deprecation 的实现未被本提交改动。全量测试、
构建和 packed consumer 均通过，未发现这些已关闭项回归。

## 验证记录

在指定 commit 上执行：

- 定向 manager、Store、Layer、History 和 browser integration：5 files /
  102 tests 通过。
- `pnpm typecheck`：通过。
- `pnpm exec vitest run`：15 files / 163 tests 通过。
- `pnpm build`：通过。
- `pnpm test:consumer`：通过；隔离 root/React/legacy React/Svelte/tools/loaders
  packed consumers 均完成 load、typecheck 和 Vite build。
- 直接运行当前内置 LayerManager 的 mutation probe：
  `getLayerForAnnotation()` 返回值和 created event payload 均可改写内部 Layer。
- 直接运行当前内置 HistoryManager 的 merged-execute-failure probe：
  输出 `{"value":-2,"undo":0,"redo":1}`，确认失败后 undo 语义已损坏。
- `git diff --check`：通过。

## 结论

**blocked**

第四轮修复使 contract suite 真正以同一组 factory 测试运行，并关闭了第三轮明确列出的
Store 重复 ID、update ID mismatch 和 Layer 同 z-index 排序差异；Store、Selection
及真实 Annotator 注入链已达到本轮要求。但 Layer 快照/事件隔离与 History merging
失败仍是未进入共享 suite 的可观察合同，而且当前内置/独立实现存在不一致或共同错误，
因此 manager contract finding 仍不能关闭。
