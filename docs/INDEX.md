# Annota 文档索引

本文件是 Annota 项目内部文档的入口。面向使用者的产品文档位于
[`src/content/docs`](src/content/docs/)。

## 交付计划

- [`plan/README.md`](plan/README.md)：计划文档的组织方式与状态约定。
- [`plan/analysis/annota-refactoring.md`](plan/analysis/annota-refactoring.md)：
  Annota 领域边界、稳定性、正确性、测试、公共 API 与性能重构方案。
- [`plan/backlog.md`](plan/backlog.md)：尚未进入具体任务的非阻塞改进项。

## 维护约定

- 公共行为发生变化时，同一变更必须更新对应设计文档和用户文档。
- 实施任务应引用本索引中的设计或分析文档，并明确代码范围和验收方式。
- 已失效的文档应更新、归档或删除，避免同时存在多个相互冲突的事实来源。
