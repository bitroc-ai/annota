# Annota 交付计划

`docs/plan/` 用于记录尚未完成的工程分析、实施任务、验证结果和待办事项，
不属于面向 npm 使用者发布的产品文档。

## 目录约定

```text
docs/plan/
├── README.md       # 本说明
├── analysis/       # 重构分析、模块拆分和实施顺序
├── tasks/          # 后续按分析文档拆出的独立交付任务
├── reviews/        # 任务验证结果
└── backlog.md      # 暂不阻塞交付的改进项
```

`tasks/` 和 `reviews/` 在产生第一项任务或评审时再创建。

## 状态约定

任务文件使用以下状态：

```text
pending → ready → in-progress → done
                         └────→ blocked
```

- `pending`：依赖尚未完成。
- `ready`：可以开始实施。
- `in-progress`：正在开发或验证。
- `done`：实现、验证和文档同步均已完成。
- `blocked`：存在明确阻塞条件，需要外部决策或依赖变化。

## 当前分析

- [`analysis/annota-refactoring.md`](analysis/annota-refactoring.md)：
  面向 1.0 稳定性的分阶段重构方案。
