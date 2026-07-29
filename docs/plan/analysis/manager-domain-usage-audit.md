# Manager 注入与领域耦合 usage audit

审计日期：2026-07-27

## 范围与方法

使用代码搜索检查本仓库 `src/`、`test/`、`examples/`、`docs/src/`，并检查当前公开
Git 历史、npm 包入口及同一工作区中的已知 BitPath consumer。没有对其他未知外部
代码作未经证实的假设。

## 已知 BitPath consumer

BitPath 当前在 `package.json` 中依赖 `annota: ^0.10.11`。SemVer 的 caret 范围不会
接受 `0.11.0`，因此 BitPath 不会因 Annota 0.11 发布而自动升级；升级必须由 BitPath
显式修改依赖版本并完成迁移。

BitPath 当前有多类从包根 `annota` 导入的调用：

- React 组件和 hooks，包括 `AnnotaProvider`、`AnnotaViewer`、`Annotator`、
  `useAnnotator`、`useAnnotations`、`useSelection` 和编辑相关 hooks；其中
  `image-viewer.tsx` 还通过 `import('annota')` 动态加载 React 组件。
- 工具与几何 helper，包括 `PointTool`、`PolygonTool`、`SamTool`、
  `containsPoint` 等。
- loader 的动态导入，包括 `loadH5Coordinates`、`loadMaskPolygons` 和
  `exportMasksToPng`。
- `Annotation`、`SamPredictFn` 等类型导入。

升级到 0.11 时，React 静态和动态导入应迁移到 `annota/react`，工具迁移到
`annota/tools`，loader 迁移到 `annota/loaders`；框架无关类型和核心 API 可继续从
`annota` 导入。若 BitPath 需要先做最小改动验证，可临时把旧的包根导入改为
`annota/legacy-react`，但该兼容入口计划在 2.0 删除。完成这些导入迁移并运行 BitPath
自身的 typecheck、测试和构建，是显式升级 Annota 依赖的前置条件；本次任务不修改
BitPath 仓库。

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
