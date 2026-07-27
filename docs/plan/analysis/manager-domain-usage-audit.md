# Manager 注入与领域耦合 usage audit

审计日期：2026-07-27

## 范围与方法

使用代码搜索检查本仓库 `src/`、`test/`、`examples/`、`docs/src/`，并检查当前公开
Git 历史和 npm 包入口。当前仓库没有登记额外的已知私有 consumer，因此没有对未知
外部代码作未经证实的假设。

## Manager 注入点

| 注入点 | 仓库外部示例使用 | 仓库内部用途 | 决定 |
| --- | --- | --- | --- |
| `store` | 未发现 | React provider、tools、hooks 读取或直接写入 | 兼容保留；正式导出 `AnnotationStore`、工厂和原子契约。稳定写入走 façade |
| `layerManager` | 未发现 | 渲染可见性、透明度、锁定和 hooks | 正式扩展点；导出 `LayerManager`、工厂和 contract tests |
| `selectionManager` | 未发现 | framework hooks、编辑器和 stage 同步 | 兼容保留；导出接口与工厂，稳定调用走 `selection` controller |
| `historyManager` | 未发现 | tools、hooks、undo/redo | 兼容保留；导出接口与工厂，稳定调用走 `history` controller |

这些注入项已发布在 `OpenSeadragonAnnotatorOptions`，直接删除会破坏兼容性。因此本次
不删除，而是补齐类型、工厂、错误行为和共享核心测试。`state` 保留为 deprecated
兼容视图，并新增明确标注不稳定的 `unsafeState`；文档不再把直接 manager 写入作为
默认路径。

## 病理耦合

| 项目 | 证据 | 处理 |
| --- | --- | --- |
| RGB mask | 旧 loader 将 R/G 解释为 cell ID、B 解释为 class | 新 `decodeRgb16Pixel` 仅返回通用 `instanceId`/`classId`；业务 properties 由 `mapProperties` 注入 |
| positive/negative helper | 只读取 `properties.classification`，positive 还存在 shape fallback | 保留 deprecated 兼容 helper；规范替代为 `createPropertyFilter` |
| `properties.layer` | loader、文档和 playground 广泛使用 | normalization 单向迁移到一等 `layerId`，存储快照不保留双重状态 |
| H5/PGM/SAM | 表示通用格式或算法；未发现必须的 cell/nucleus/diagnosis 规则 | 保留在通用 loader/tool 边界 |
| Layer 默认值 | 只有 `image` 和 `default` | 保留，均无病理含义 |

## 正式扩展边界

- Store、Layer、Selection、History 的 capability interface 与工厂是兼容且正式的
  高级扩展点。
- Annotator façade 是应用默认入口；自定义 manager 不应绕过 normalization、
  transaction 和 typed events。
- 病理关系、诊断规则、统计和持久化继续属于 Domain。Annota 只透传泛型
  `properties`，并提供 layer、spatial candidate query 和 exact geometry。
