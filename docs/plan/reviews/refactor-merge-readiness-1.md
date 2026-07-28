# refactor-merge-readiness 第 1 轮验证

评审对象：`d8b59e6f09e966fa13c6231815d8ffd95a7958dd`

## Findings

无 P1、P2 或 P3 finding；没有 blocking 或 non-blocking 交付缺口。

逐项核对结果：

- `docs/plan/tasks/refactor-merge-readiness.md` 的全量测试合同与
  `test/docs/import-contract.test.ts`：完整 Vitest 在正常并行配置下连续运行三次，
  每次均为 17 files / 189 tests 通过，scanner 用例未超过显式 15 秒 timeout。
- 任务 release contract、`.github/workflows/publish.yml` 与
  `scripts/validate-release-package-version.mjs`：package version 校验位于 changelog
  生成之前；独立以 `1.0.1` 对当前 `package.json.version` `1.0.0` 验证时退出码为 1，
  因而 mismatch 会在 changelog mutation 和 publish 之前终止。
- 任务 changelog contract 与 `scripts/generate-changelog.mjs`：使用含两个
  `v1.0.0` section 的临时 changelog，连续两次生成 `1.0.0` 后文件内容字节一致，
  且只剩一个 `v1.0.0` section，其他版本 section 保留。
- `docs/plan/analysis/annota-refactoring.md` 的只读快照合同与
  `src/core/normalization.ts`：独立调用构建产物的 `normalizeAnnotation`，确认
  `handleIn` / `handleOut` 与输入引用分离；修改输入不影响快照，递归遍历 Path
  annotation 的全部可达对象均为 frozen。
- 任务 consumer-audit contract、`docs/plan/analysis/manager-domain-usage-audit.md` 与
  `docs/src/content/docs/guides/migration-1-0.mdx`：只读核对同一工作区 BitPath，
  `package.json` 确为 `annota: ^0.10.11`；源码同时存在 root React 静态导入、
  `image-viewer.tsx` 的 root 动态 React 导入、工具/几何导入和 loader 动态导入。
  文档准确说明 1.0 不会被当前 caret range 自动接收，并给出
  `annota/react`、`annota/legacy-react`、`annota/tools`、`annota/loaders` 的迁移边界。
- 任务 clean-diff contract：`git diff --check v2...HEAD` 无输出并以 0 退出。

## Verification

| 验证 | 结果 |
| --- | --- |
| `pnpm typecheck` | 通过 |
| `pnpm exec vitest run`，连续 3 次 | 每次 17 files / 189 tests 通过 |
| `pnpm build` | 通过 |
| `pnpm test:browser` | 1 file / 9 tests 通过 |
| `pnpm test:frameworks` | 2 files / 2 tests 通过 |
| `pnpm test:consumer` | root、React、legacy React、Svelte、tools、loaders packed consumers 通过 |
| `pnpm benchmark:ci` | 1k、10k 基线均通过 |
| `pnpm check:docs-imports` | 84 个文档文件通过 |
| `pnpm --dir docs install --frozen-lockfile` | 通过 |
| `pnpm --dir docs build` | 47 pages 通过 |
| `git diff --check v2...HEAD` | 通过 |
| 独立临时合同复现 | workflow 顺序、mismatch、changelog 双跑、Path 深冻结/分离均通过 |

构建过程中仍会输出已有的 Svelte SVG a11y、bundle chunk size/circular chunk warning；
这些不由本提交引入，不影响本任务合同或既有门禁结果，因此不记为本任务 finding。

## 结论

pass
