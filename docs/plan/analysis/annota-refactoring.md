# Annota 重构方案

> 状态：提案（已吸收代码审阅意见）
> 适用版本：`0.10.11` 之后
> 目标：在不破坏现有标注工作流的前提下，把 Annota 提升到可长期维护、
> 可验证、可稳定集成的 1.0 级基础库。

## 1. 背景与结论

Annota 已经具备完整的库形态，而不是概念验证项目。当前代码覆盖核心状态、
历史记录、图层、OpenSeadragon 适配、PixiJS 渲染、React/Svelte 封装、
标注工具、数据加载和文档站。性能设计也包含 R-tree 空间索引、视口裁剪、
渲染缓存、交互快照和按需绘制。

当前主要风险不在功能数量，而在以下工程边界：

1. 生命周期销毁不完整，重复挂载时可能残留 observer、事件监听和 RAF。
2. 核心状态和数据加载的错误契约不统一，部分失败会被静默转换为空结果。
3. 测试集中在少数模块，渲染、框架集成和关键 loader 缺少回归保护。
4. 公共导出、peer dependency、README 和实际实现之间存在漂移。
5. 性能声明缺少可复现的 benchmark，无法防止性能回退。
6. CI 只在发布流程执行，PR 合并前缺少强制质量门禁。
7. Annotator 的稳定 façade 与内部状态没有分界，事件、更新、批量操作和
   manager 注入也尚未形成一致的公共契约。
8. 病理是主要使用场景，但“病理优化”与“核心理解病理语义”的边界尚未写入契约；
   BC Cell mask、positive/negative filter 等能力存在向通用核心泄漏领域含义的风险。

因此，本轮重构应优先收紧生命周期和数据契约，再补齐测试与 CI，最后整理
公共 API、文档和性能基线。接口整理应采用“先新增稳定入口和兼容代理、再逐步
废弃旧入口”的方式，不能把内部重构直接转化为无迁移路径的破坏性变更。
Annota 核心必须保持领域无关：理解几何、图层、空间、交互和渲染，但不理解
“细胞”“细胞核”“浸润癌”或“诊断”。

## 2. 当前基线

基于 `0.10.11` 的本地验证结果：

| 检查项                  | 结果                                                            |
| ----------------------- | --------------------------------------------------------------- |
| `pnpm typecheck`        | 通过                                                            |
| `pnpm exec vitest run`  | 7 个测试文件、89 个测试全部通过                                 |
| `pnpm build`            | ESM、CJS、类型声明和 Svelte 包构建通过                          |
| `pnpm --dir docs build` | 46 个静态页面构建通过                                           |
| npm 包预览              | 约 154 KB，包含主入口、样式、类型和 Svelte 子入口               |
| 文档构建告警            | 存在大于 500 KB 的前端 chunk；未配置 Astro `site`，跳过 sitemap |

这些结果说明项目当前可以构建和发布，但“能够构建”不等于生命周期、
错误处理和跨框架集成已经得到充分验证。

### 2.1 当前 API 与目标 API

第 6 节描述的是 **1.0 目标态，不是当前已经实现的 exports**。实施和文档示例
必须明确区分两者：

| 1.0 目标 API               | `0.10.11` 现状                                      |
| -------------------------- | --------------------------------------------------- |
| `createAnnotator`          | `createOpenSeadragonAnnotator`                      |
| `annota/react`             | React 组件和 hooks 位于根入口 `annota`              |
| `annota/svelte`            | 已存在                                              |
| `annota/tools`             | 不存在；tools 从根入口导出                          |
| `annota/loaders`           | 不存在；部分 loader 从根入口导出                    |
| `annota/styles.css`        | `annota/dist/index.css`                             |
| `annotator.annotations.*`  | `addAnnotation`、`updateAnnotation` 等扁平方法      |
| `annotator.events.*`       | `on`、`off`、`emit`，payload 为 `any`               |
| `annotator.spatial.search` | `store.getIntersecting`，实际为 bounds 候选         |
| `annotator.geometry.*`     | 几何函数散落在根入口和 core                         |
| `AnnotationInput`          | 不存在；调用者必须提供包含 `bounds` 的 `Annotation` |
| `Annotation.layerId`       | 图层归属存放在 `properties.layer`                   |
| 通用 instance mask 映射    | `loadMaskPolygons` 内置 BC Cell RGB 解释            |

目标 API 只能通过兼容入口逐步引入。在目标子入口、类型或方法尚未实现前，README
和示例不得把它们描述为当前可用能力。

## 3. 范围

### 3.1 本轮目标

- 所有 annotator 资源都具备对称的创建与销毁路径。
- 核心 store、loader 和事件系统具备清晰、可测试的行为契约。
- 高风险模块具备单元测试，真实集成链路具备集成测试。
- PR 必须通过类型检查、测试、构建和包内容检查。
- React 与 Svelte 消费方式互不强制安装无关框架。
- Annotator 对外提供按能力域组织的稳定 façade，内部 manager 不再作为默认操作路径。
- Annotation 写入时统一规范化几何数据与 `bounds`，避免空间索引使用过期边界。
- 所有变更事件携带明确类型、操作来源、事务和临时状态信息。
- 正式依赖注入点完整导出类型、工厂和契约；非正式内部实现不再暴露。
- 核心只透传泛型 `properties`，不解释病理字段或业务关系。
- 提供稳定的 Layer、Spatial Query 和 Geometry 通用能力，供病理等上层领域组合。
- Instance mask loader 采用通用解码与注入映射，不在核心硬编码 BC Cell 业务语义。
- README、API 文档和实际导出保持一致。
- 若继续保留“10,000+ annotations at 60 FPS”等性能声明，则该声明必须可以复现
  和比较；否则在 1.0 前删除未经验证的声明。

### 3.2 非目标

- 不新增标注工具、文件格式或模型能力。
- 不替换 OpenSeadragon、PixiJS、React 或 Svelte。
- 不在本轮重写整个状态管理系统。
- 不在兼容小版本中删除现有扁平方法或 `state` 访问方式；根入口 React 导出为满足
  framework-independent/optional-peer 契约，迁移到 `annota/legacy-react` 兼容入口。
- 可以新增内部规范化类型和下一主版本接口，但必须保留兼容代理和迁移说明。
- 不在核心类型中增加 `cellType`、`nucleusId`、`tumorGrade`、`invasiveCancer`
  等病理专用字段。
- 不负责细胞—细胞核、区域—细胞等领域关系、诊断区域互斥、级联删除、病理统计
  或诊断优先级。
- 不把 Layer `zIndex` 解释为业务优先级，也不把包围盒候选查询解释为精确空间关系。
- 不以重构名义进行无关的格式化或目录重排。

## 4. 架构、领域边界与关键链路

### 4.1 当前运行时组合

```text
React / Svelte
      │ 创建、持有
      ▼
OpenSeadragon Annotator
      ├── AnnotationStore ──► SpatialIndex
      ├── SelectionManager
      ├── HistoryManager
      ├── LayerManager
      ├── ToolHandler
      └── PixiStage ──► PixiJS / GPU
              ▲
              │ viewport、store、selection、layer 事件
OpenSeadragon Viewer
```

关键生命周期：

```text
组件挂载
  → 创建 OpenSeadragon viewer
  → 异步创建 PixiStage
  → 挂载 overlay canvas
  → 注册 store / selection / layer observer
  → 注册 viewer / DOM 事件
  → 运行交互和 RAF
  → 组件卸载
  → 取消异步结果与 RAF
  → 注销全部 observer / 事件
  → 销毁 tool / stage / canvas
```

重构后的要求是：上图中每个“注册、创建、调度”动作都必须有且仅有一个
对应的“注销、销毁、取消”动作，并且 `destroy()` 可重复调用。

### 4.2 目标领域边界

```text
Pathology Domain（不属于 Annota）
├── Cell / Nucleus / Region 业务类型
├── parent-child / contains / overlaps 关系
├── 诊断分类和互斥规则
├── 统计、审核和持久化
└── 将业务属性映射到 Annotation.properties
                  │
                  ▼
Annota
├── Annotation / Shape
├── Layer / zIndex / opacity / visibility / locked
├── Spatial Candidate Query
├── Exact Geometry / merge / split / intersects
├── Selection / Editing / History
├── Typed Events / Transactions
├── Tools
└── PixiJS Rendering
                  │
                  ▼
OpenSeadragon Adapter
├── 坐标转换
├── Viewer Events
└── Viewport Synchronization
                  │
                  ▼
OpenSeadragon
大图加载、缩放、平移、旋转
```

这条边界不排斥病理场景优化。病理可以继续作为首要 use case，H5、mask、SAM 等
通用能力也可以保留；但核心类型、事件、图层和几何契约不能依赖病理名词或规则。

### 4.3 职责矩阵

| 能力                         | Annota             | 上层病理领域   |
| ---------------------------- | ------------------ | -------------- |
| Shape 绘制与编辑             | 负责               | 使用           |
| 图层显示、锁定、透明度       | 负责               | 配置           |
| `zIndex` 渲染顺序            | 负责               | 选择顺序       |
| 包围盒候选查询               | 负责               | 使用候选       |
| polygon 相交、包含、IoU      | 提供通用几何原语   | 解释业务含义   |
| cell / nucleus / region 含义 | 不解释             | 负责           |
| 细胞核属于哪个细胞           | 不维护             | 负责           |
| 细胞是否位于浸润癌区域       | 提供候选和精确几何 | 解释并维护关系 |
| 诊断区域互斥和优先级         | 不负责             | 负责           |
| 阳性率、细胞统计             | 不负责             | 负责           |
| 病理数据持久化               | 发出类型化事件     | 负责           |

### 4.4 跨模块关系

| 调用方                | 被调用方               | 契约                                             |
| --------------------- | ---------------------- | ------------------------------------------------ |
| Domain                | Annotator façade       | 提交通用 AnnotationInput，订阅变更事件           |
| Annotator             | LayerController        | 解析可见、锁定、透明度和渲染顺序                 |
| Annotator             | SpatialQueryController | 获取包围盒候选，不承诺精确相交                   |
| Domain / Tools        | GeometryController     | 执行精确 contains、intersects、IoU、merge、split |
| PixiStage             | LayerController        | 根据稳定 Layer 状态计算最终渲染属性              |
| OpenSeadragon Adapter | OpenSeadragon          | 转换坐标、监听 viewport、同步渲染                |
| Loader                | Normalizer             | 输出 AnnotationInput，经规范化后才能进入 Store   |

集成测试必须覆盖这些真实连接，不能只分别测试模块内部实现。

## 5. 问题分析

### 5.1 生命周期资源没有完全收口

`createOpenSeadragonAnnotator` 注册了 selection observer，以及
`canvas-press`、`canvas-drag`、`canvas-release` 等 viewer handler；
当前 `destroy()` 没有逐一注销。pointer move 和 drag 使用的 RAF 也没有统一取消。

当前已确认的非对称资源清单：

| 注册或调度                                             | 当前遗漏的清理                           |
| ------------------------------------------------------ | ---------------------------------------- |
| `selection.observe(onSelectionChange)`                 | `selection.unobserve(onSelectionChange)` |
| `viewer.addHandler("canvas-press", onCanvasPress)`     | 对应 `removeHandler`                     |
| `viewer.addHandler("canvas-drag", onCanvasDrag)`       | 对应 `removeHandler`                     |
| `viewer.addHandler("canvas-release", onCanvasRelease)` | 对应 `removeHandler`                     |
| `pointerMoveRafId`                                     | `cancelAnimationFrame(pointerMoveRafId)` |
| `dragRafId`                                            | `cancelAnimationFrame(dragRafId)`        |

React 与 Svelte 组件已经使用 `cancelled` 标志处理“异步初始化完成前组件先卸载”的
常见路径，这是应保留的已有保护。核心 factory 和 Annotator 的资源清理仍需完整
收口；框架层测试用于证明保护有效，不应重新实现第二套销毁逻辑。

影响：

- React Strict Mode 或路由切换后可能累积监听。
- 同一 viewer 重新创建 annotator 后可能重复选择、拖动或写入历史。
- 已销毁的 PixiStage 可能被延迟回调访问。
- 长时间标注会话存在内存泄漏风险。

重构要求：

- 建立统一的 disposer 注册表，资源创建后立即登记清理函数。
- `destroy()` 先设置 destroyed 状态，再取消 timer/RAF，随后注销 observer 和事件，
  最后销毁 stage 与 canvas。
- handler 和 observer 的注册/注销必须成对出现在测试断言中。
- `refactor-001` 至少覆盖 Strict Mode 双挂载、路由切换、初始化中途卸载、同一
  viewer 重建 annotator、连续两次 `destroy()` 和有待执行 RAF 时销毁。

### 5.2 Store 批量写入的事件语义不一致

`add()` 遇到重复 ID 会抛错；`addAll(..., false)` 则会覆盖已有记录，
但仍把所有输入作为 `created` 事件发出。消费者可能因此把更新误判为创建。

重构要求：

- 明确选择一种契约：
  - 严格模式：任何重复 ID 都拒绝整批写入；或
  - upsert 模式：新增项进入 `created`，已有项进入 `updated`。
- 批量写入必须是原子的：验证全部输入后再修改 store 和 spatial index。
- 同一批次内的重复 ID 必须有明确行为并写入测试。
- store 与 spatial index 在异常后必须保持一致。
- 新增 `test/core/store.test.ts`，直接覆盖 insert、upsert、replace、批内重复 ID、
  observer 事件分类、异常原子性和 spatial index 一致性。

建议采用显式 API：

```ts
store.addAll(annotations, { mode: "insert" });
store.addAll(annotations, { mode: "upsert" });
store.replaceAll(annotations);
```

如需兼容现有签名，应保留旧入口并标记 deprecated，在下一个主版本删除。

### 5.3 Mask loader 混合了解码、领域映射和 OpenCV 资源管理

当前 RGB instance mask 直接假设 BC Cell 编码：R/G 通道用于实例 ID，B 通道
用于类别。这既没有把 B 通道类别稳定传出，也把特定上游格式的业务解释放进了
通用 loader。多个异常分支又直接返回空数组，调用者无法区分空 mask、OpenCV
未就绪和解码失败。

重构要求：

- 将纯数据解码与 OpenCV 轮廓提取拆开：
  1. PNG 像素解码；
  2. mask 类型与编码策略识别；
  3. 通过 `decodePixel` 提取通用 instance ID 和 attributes；
  4. 二值子区域生成；
  5. 轮廓提取；
  6. 通过 `mapProperties` 注入领域 properties；
  7. 输出通用 decoded region，并由兼容 adapter 生成当前 Annotation。
- 纯数据步骤不得依赖 `window.cv`，以便在 Node 环境做确定性单元测试。
- 采用方案 A“通用解码 + 注入映射”。核心提供泛型接口和常用编码 preset，
  不知道 B 通道的 class 代表细胞类别、组织类别还是其他业务含义：

```ts
interface RgbaPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface DecodedInstance<A = Record<string, unknown>> {
  instanceId: number;
  attributes?: A;
}

interface InstanceMaskLoaderOptions<
  P extends AnnotationProperties = AnnotationProperties,
  A = Record<string, unknown>,
> {
  decodePixel(pixel: RgbaPixel): DecodedInstance<A> | null;
  mapProperties?(instance: DecodedInstance<A>): P;
}
```

- BC Cell 作为调用方配置，而不是核心特例：

```ts
interface PathologyMaskProperties extends AnnotationProperties {
  entityType: "cell";
  cellClass: "positive" | "negative" | "unknown";
}

interface BcMaskAttributes {
  classId: number;
}

const annotations = await loadInstanceMask<
  PathologyMaskProperties,
  BcMaskAttributes
>(input, {
  decodePixel(pixel) {
    const instanceId = (pixel.r << 8) | pixel.g;
    if (instanceId === 0) return null;

    return {
      instanceId,
      attributes: { classId: pixel.b },
    };
  },

  mapProperties(instance) {
    return {
      entityType: "cell",
      cellClass: mapBcClass(instance.attributes?.classId),
    };
  },
});
```

- 如为性能提供内置 RGB16 preset，该 preset 只能定义通道编码并返回通用
  `instanceId` / `classId`，不得将 `classId` 命名为病理类别。
- `mapProperties` 可选；未提供时 loader 只生成领域无关的来源、instance ID 和
  通用 attributes。核心不得默认写入 `entityType: "cell"`。
- `refactor-003` 在 0.11 完成纯解码、映射和当前 Annotation 兼容 adapter；
  `refactor-008` 引入正式 `AnnotationInput` 后，再让规范 loader 直接输出
  `AnnotationInput[]`。两阶段共享同一 decoder，禁止复制实现。
- 解码失败应抛出带原因的错误，或返回带 diagnostics 的结果，不得静默返回 `[]`。
- 所有 OpenCV `Mat`、`MatVector` 和 contour 都使用 `try/finally` 清理。当前
  `contours.get(i)` 返回的 contour 也必须逐个调用 `delete()`。
- 增加 RGB/RGBA、ID 小于和大于 256、空图、损坏 PNG、OpenCV 失败、
  自定义 `decodePixel`、自定义 `mapProperties` 和无领域映射的回归测试。

### 5.4 事件和扩展边界使用过多 `any`

Annotator 事件、OpenSeadragon 扩展事件、tool options 和 React/Svelte hooks
中存在较多 `any`。这会把错误推迟到运行期，并削弱公共类型声明的价值。

重构要求：

- 使用事件映射定义 payload，并为所有会修改 annotation 的事件附带统一上下文：

```ts
interface ChangeContext {
  source: "user" | "api" | "tool" | "history" | "loader";
  transactionId?: string;
  transient: boolean;
}

interface AnnotatorEventMap {
  "annotation:create": {
    annotation: Annotation;
    context: ChangeContext;
  };
  "annotation:update": {
    previous: Annotation;
    annotation: Annotation;
    context: ChangeContext;
  };
  "annotation:delete": {
    annotation: Annotation;
    context: ChangeContext;
  };
  "selection:change": {
    previous: string[];
    current: string[];
    context: ChangeContext;
  };
  notification: AnnotatorNotification;
}
```

- `on`、`off`、`emit` 使用泛型事件键约束 payload。
- 对外订阅优先返回 disposer，避免调用者必须保存原 handler 才能取消订阅：

```ts
const dispose = annotator.events.on("annotation:update", (event) => {
  persist(event.annotation);
});

dispose();
```

- `source` 区分用户操作、API、tool、history 和 loader；`transactionId` 聚合同一
  批操作；`transient` 区分绘制预览与最终可持久化结果。
- 在兼容期继续发送现有事件名，但由同一内部事件映射生成，禁止维护两套事件逻辑。
- 对 OpenSeadragon 缺失字段使用局部扩展接口，不把整个事件转换为 `any`。
- OpenCV 等第三方无类型边界集中在 adapter 文件中，核心模块只接收已验证类型。

### 5.5 拖动预览与最终变更没有明确事件边界

当前 annotation 拖动在每一帧直接调用 `store.update()`，因此每一帧都会触发
`updateAnnotation` 和重绘；history 则只在 release 时记录命令。自动保存或审计
订阅者无法判断哪些 update 是预览，可能在一次拖动中持久化大量中间状态。

目标语义：

```text
press
  → drag frame 1 ── transient update ┐
  → drag frame 2 ── transient update ├─ 不进入持久化 history
  → drag frame N ── transient update ┘
release
  → final update ── transient: false ── 产生一个可撤销命令和持久化事件
```

重构要求：

- 预览更新可以多次发生，但必须携带 `transient: true`。
- 预览更新不得进入持久化 history，也不得伪装成最终业务变更。
- release 只生成一次最终 update、一次 history command 和一个逻辑 transaction。
- 取消拖动必须恢复原 annotation，且不产生最终持久化事件。
- façade、tool、history 和兼容旧事件都从同一事务管线获得该语义。
- 集成测试必须断言 N 次 drag 不会导致 N 次最终事件或 N 个 undo step。

### 5.6 Annotator façade 与内部状态没有边界

当前 Annotator 将 annotation、selection、layer、history、rendering 和 event 方法
全部平铺在同一对象上，同时通过 `annotator.state` 暴露 store、manager 和交互状态。
业务方可以绕过历史记录和事件系统直接调用 store，形成多条状态写入路径。

重构要求：

- 新增按能力域组织的稳定 façade：

```ts
annotator.annotations.add(annotation);
annotator.annotations.update(id, patch);
annotator.annotations.remove(id);
annotator.annotations.list();

annotator.selection.set(ids);
annotator.selection.clear();
annotator.layers.create(config);
annotator.history.undo();
annotator.events.on("annotation:update", handler);
```

- 所有公共写操作必须进入同一命令与事务管线，再同步 store、history、rendering
  和 event；不得由 façade 分别拼装副作用。
- 现有 `addAnnotation()`、`setSelected()`、`undo()` 等扁平方法在兼容期代理到新
  façade，并标记 deprecated；禁止复制实现。
- 将 `state` 降级为显式的不稳定高级接口，例如 `unsafeState`，并提供只读类型。
- `toolDrawing`、`activeTool`、hover 和 editing 等交互细节不属于稳定公共 API。
- 对外集合返回只读快照，禁止通过共享对象引用绕过更新管线。

### 5.7 Annotation 输入规范化与更新契约不安全

当前所有 shape 都要求调用者同时提供几何字段和 `bounds`。业务方更新坐标后如果
遗漏 `bounds`，空间查询、命中检测和实际绘制会产生分歧。`updateAnnotation(id,
annotation)` 又要求 `id` 与 `annotation.id` 重复出现并保持一致。

重构要求：

- 区分对外输入和内部规范化类型：

```ts
interface AnnotationInput {
  id: string;
  shape: ShapeInput; // 不接收 bounds
  properties?: AnnotationProperties;
  style?: AnnotationStyle;
}

interface StoredAnnotation extends AnnotationInput {
  shape: NormalizedShape; // 包含只读且由核心计算的 bounds
}
```

- 所有 add/load/update 路径进入同一 normalization 函数，由核心计算 `bounds`。
- 公共更新采用单一 ID 来源和 patch 语义：

```ts
annotator.annotations.update(id, {
  shape,
  properties,
  style,
});
```

- patch 必须定义浅合并、替换和字段删除语义，不能依赖 JavaScript 对象展开的偶然行为。
- Store 内部只接收规范化 annotation；SpatialIndex 不自行接受未经验证的 bounds。
- 兼容期继续接收现有 Annotation，但写入前忽略并重算调用方传入的 `bounds`。

### 5.8 Manager 依赖注入没有形成完整契约

`createOpenSeadragonAnnotator` 接受 store、layer、selection 和 history manager，
但根入口没有完整、对等地导出所有接口和工厂。使用者可以看到注入点，却无法依赖
一个稳定的实现契约。

重构要求：

- 逐项判断 manager 是否为正式扩展点，不默认把所有内部对象都公开。
- 正式扩展点必须导出接口、创建工厂、生命周期、错误行为和 contract tests。
- 非正式扩展点从公共 options 中移除，改为内部组合。
- adapter 只依赖最小 capability interface，不依赖具体 manager class。
- 自定义实现必须通过共享 contract test suite，确保与内置实现行为一致。
- 修改公开注入点前先执行 usage audit：检索本 monorepo、公开示例和已知消费项目中
  对 `store`、`historyManager`、`selectionManager`、`layerManager` 的实际注入。
  audit 结果写入 `docs/plan/analysis/`，作为保留或收缩扩展点的依据。

### 5.9 测试没有覆盖最关键的集成关系

现有测试验证了 history、layer、部分 tool 和 GeoJSON，但 `AnnotationStore`、
`SpatialIndex`、`SelectionManager` 没有直接单元测试，以下连接链路也缺少保护：

| 集成关系                          | 必须验证的真实行为                                 |
| --------------------------------- | -------------------------------------------------- |
| React/Svelte → Annotator          | 创建、取消初始化、重复卸载                         |
| Annotator → Store → PixiStage     | create/update/delete 只触发一次渲染和事件          |
| Viewer → Annotator                | press/drag/release、resize、viewport 更新及销毁    |
| Selection/Layer → PixiStage       | 选择、可见性、透明度和锁定状态同步                 |
| Loader → Annotation               | ID、类别、bounds、错误原因和资源释放               |
| History → Store                   | 拖动结束只产生一个可撤销命令，不重复发出无意义更新 |
| Façade → Command → Store          | 所有写入只有一条副作用管线，旧接口只是兼容代理     |
| Store → Normalizer → SpatialIndex | 外部错误 bounds 不会污染空间查询                   |
| 自定义 Manager → Annotator        | 正式注入点通过与内置实现相同的 contract suite      |
| Package exports → Consumer        | ESM、CJS、React、Svelte、CSS 均可被最小项目导入    |

单元测试优先使用真实核心实现；只有浏览器、WebGL 和 OpenCV 边界可以使用受控
fake。至少增加一个使用真实 OpenSeadragon viewer 和 canvas 生命周期的集成测试，
以及一个从公共 façade 到 store、history、event 和 rendering 的真实调用链测试。

### 5.10 公共包边界与文档不一致

当前根入口偏向 React，但 `react`、`react-dom`、`svelte` 同时作为强制 peer
dependency。README 又将项目描述为 React-first，并使用与实际导出不一致的
loader 名称。

已确认的 README 漂移：

| README 名称 | 根入口实际 export                                                                       |
| ----------- | --------------------------------------------------------------------------------------- |
| `loadJSON`  | 不存在；内部有 `loadJSONFile` / `parseJSON`，根入口仅公开 `exportJson` / `downloadJson` |
| `loadPGM`   | `loadPgmFile` / `loadPgmPolygons`                                                       |

建议的包边界：

```text
annota              # 框架无关 core、adapter、tools、loaders、types
annota/react        # React provider、components、hooks、editor
annota/svelte       # Svelte components、stores、editor
annota/styles.css   # 稳定的样式入口
```

迁移要求：

- `annota` 根入口在 1.0 重构中立即成为 framework-independent，避免 optional peer
  通过静态依赖泄漏到 core-only consumer。
- React 稳定入口为 `annota/react`；原根 React API 的兼容期改由带明确废弃信息的
  `annota/legacy-react` 提供，并在 2.0 删除。
- 使用 `peerDependenciesMeta.optional` 或子包方案避免强制安装无关框架。
- 增加 consumer fixture，验证四个入口在最小项目中安装和构建。
- README 中的安装命令、导入名、链接和 API 表必须从实际 exports 校验。

### 5.11 性能声明不可复现

“10,000+ annotations at 60 FPS”缺少固定数据、视口操作、设备条件和采样方法，
因此无法作为回归门禁。

重构要求：

- 创建固定 seed 的 1k、10k、50k annotation 数据集。
- 分别测量初次载入、平移、缩放、选择、批量更新和销毁。
- 记录平均帧时间、P95 帧时间、主线程长任务、显存/内存趋势。
- CI 只做宽松的回归检测；正式性能数据在固定浏览器和设备上生成。
- README 只引用可复现结果，并注明环境与测试脚本；如果 1.0 前无法建立可信
  benchmark，则删除具体的帧率和规模承诺，不能保留不可证实的数字。

### 5.12 病理语义正在泄漏到通用接口

Annota 的描述和部分 helper 使用 pathology、cell、positive/negative 等词汇。
面向病理优化没有问题，但核心一旦解释这些字段，就会让 layer、filter、loader
和 Annotation 模型无法稳定服务其他领域。

需要审计：

- `createPositiveMaskFilter`、`createNegativeMaskFilter` 和
  `createMaskPolarityFilter` 是否依赖固定病理 properties。
- RGB mask 的 BC Cell 编码和类别映射是否可以完全通过第 5.3 节注入。
- 文档示例是否把病理字段误写成 Annota 必需字段。
- Layer ID、颜色、z-index 是否存在硬编码的病理默认值。
- SAM、H5、PGM 等模块是通用格式/算法，还是包含未声明的病理规则。

处理原则：

- 通用 property 比较保留为 `createPropertyFilter` 等领域无关原语。
- 病理便捷 helper 可以放在示例、应用层或可选扩展入口，但不得成为核心状态契约。
- 已发布 helper 先提供通用替代方案和 deprecated 迁移，不在小版本直接删除。
- README 可以明确“病理是主要 use case”，但必须同时说明核心数据模型领域无关。

## 6. 目标公共接口

> 本节全部是 1.0 目标设计。除非在第 2.1 节标记为已存在，否则不能视为当前
> `0.10.11` 可调用 API。

### 6.1 导入边界

1.0 的根入口保持框架无关，React 和 Svelte 使用独立子入口。工具和 loader
是否继续从根入口重导出，可以在 consumer 测试完成后决定，但其规范入口固定：

```ts
import { createAnnotator, type Annotation, type AnnotationInput } from "annota";

import { AnnotaProvider, Viewer, Annotator, useAnnotator } from "annota/react";

import { AnnotaProvider, Viewer, Annotator } from "annota/svelte";

import { PointTool, PolygonTool } from "annota/tools";
import { loadH5Masks, loadInstanceMask } from "annota/loaders";
import "annota/styles.css";
```

`annota` 不得静态导入 React 或 Svelte。每个子入口都必须有独立的类型解析、
tree-shaking 和最小 consumer 构建测试。

### 6.2 创建和生命周期

框架无关入口：

```ts
const annotator = await createAnnotator({
  viewer,
  annotations: initialAnnotations,
  style,
  filter,
});

try {
  // 使用 annotator
} finally {
  annotator.destroy();
}
```

React/Svelte 组件负责在其生命周期内创建和销毁实例。高级用户可以向 Provider
注入外部创建的 annotator，但同一个实例在任何时刻只能有一个明确 owner。
文档必须说明谁负责调用 `destroy()`，禁止 Provider 和调用者重复竞争所有权。

### 6.3 Annotator façade

稳定公共接口按能力域组织：

```ts
interface Annotator {
  readonly annotations: AnnotationController;
  readonly selection: SelectionController;
  readonly layers: LayerController;
  readonly spatial: SpatialQueryController;
  readonly geometry: GeometryController;
  readonly history: HistoryController;
  readonly events: AnnotatorEvents;
  readonly tools: ToolController;

  setStyle(style?: StyleExpression): void;
  setFilter(filter?: Filter): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}
```

典型调用：

```ts
annotator.annotations.add(annotation);
annotator.annotations.update(annotation.id, patch);
annotator.annotations.remove(annotation.id);
annotator.annotations.replaceAll(annotations);

annotator.selection.set([annotation.id]);
annotator.layers.setVisibility("diagnosis", true);
const candidates = annotator.spatial.search(bounds);
const overlap = annotator.geometry.intersection(a.shape, b.shape);
annotator.history.undo();
```

Controller 返回只读数据；任何写入都生成一个 command 和 ChangeContext。批量操作
使用一个 transaction，undo/redo 和事件订阅看到的是同一个逻辑操作。

### 6.4 Layer 契约

Layer 是 Annota 的通用渲染与交互组织能力：

```ts
interface Layer {
  readonly id: string;
  readonly name?: string;
  readonly zIndex: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly locked: boolean;
}
```

契约：

- `zIndex` 只定义视觉绘制顺序，不代表诊断或业务优先级；数值小的图层先绘制。
- 同一 `zIndex` 使用稳定创建顺序；同一图层内 annotation 保持稳定插入顺序，
  update 不得隐式改变绘制顺序。
- `opacity` 约束为 `[0, 1]`，并与 annotation/style alpha 相乘：

```text
effectiveFillOpacity   = layer.opacity × annotation.fillOpacity
effectiveStrokeOpacity = layer.opacity × annotation.strokeOpacity
effectiveImageOpacity  = layer.opacity × imageShape.opacity
```

- 未设置的 annotation/style opacity 按 `1` 计算。
- `visible: false` 同时排除渲染、hover、hit test 和框选；数据仍可通过显式 API 读取。
- `locked: true` 阻止用户和 tool 的交互编辑，不阻止显示、读取和带
  `source: "api"` 的显式程序化更新。
- Layer ID 和名称没有领域含义；`cells`、`nuclei`、`regions` 只是业务方配置。
- `AnnotationInput.layerId` 是图层归属的正式字段。兼容期读取
  `properties.layer`，规范化后只保存为 `layerId`。

`LayerController` 至少提供 create、update、remove、list、setVisibility、
setOpacity、setLocked 和 setZIndex；每项变化都产生类型化 layer event。

### 6.5 Spatial Query 与 Geometry 契约

包围盒候选查询和精确几何运算必须分成两个模块：

```ts
// 快速 R-tree 候选查询；只承诺 bounds 相交
const candidates = annotator.spatial.search(bounds);

// 精确几何关系
annotator.geometry.intersects(a.shape, b.shape);
annotator.geometry.contains(container.shape, target.shape);
annotator.geometry.intersection(a.shape, b.shape);
annotator.geometry.iou(a.shape, b.shape);
annotator.geometry.merge(shapes);
annotator.geometry.split(shape, line);
```

契约：

- `spatial.search` 返回候选集，不得使用 `getIntersecting` 等暗示精确相交的名称。
- SpatialIndex 只接收 normalization 后的只读 `bounds`。
- Geometry API 明确支持的 Shape 类型、空结果、数值精度和错误类型。
- `contains`、`intersects` 和 IoU 只返回几何事实，不生成 cell、region、diagnosis
  等领域关系。
- Domain 可以先用 spatial 缩小候选，再用 geometry 精确判断，但关系存储和业务
  解释仍由 Domain 负责。
- merge/split 通过通用 Shape 输入输出，不读取业务 properties。

### 6.6 Annotation 写入契约

```ts
type AnnotationProperties = Record<string, unknown>;

interface AnnotationInput<P = AnnotationProperties> {
  id: string;
  shape: ShapeInput;
  layerId?: string;
  properties?: P;
  style?: AnnotationStyle;
}

interface Annotation<P = AnnotationProperties> {
  readonly id: string;
  readonly shape: NormalizedShape;
  readonly layerId: string;
  readonly properties?: Readonly<P>;
  readonly style?: Readonly<AnnotationStyle>;
}
```

- `AnnotationInput` 不要求 `bounds`，核心在写入时计算。
- `Annotation` 是规范化只读快照，不把 store 内部可变引用交给调用者。
- `properties` 支持泛型业务类型，默认类型仍允许未知扩展字段。
- update patch 使用单一 ID 来源，并明确字段合并和删除规则。
- loader 输出 `AnnotationInput[]`，不能绕过 normalization 直接写 spatial index。

病理业务可以扩展默认 properties，而不需要放弃公共字段：

```ts
interface CellProperties extends AnnotationProperties {
  cellClass: "positive" | "negative";
  score?: number;
}

const cell: AnnotationInput<CellProperties> = {
  id: "cell-1",
  shape,
  layerId: "cells",
  properties: {
    cellClass: "positive",
    score: 0.97,
  },
};
```

### 6.7 变更与事件契约

```ts
const dispose = annotator.events.on("annotation:update", (event) => {
  if (!event.context.transient) {
    persist(event.annotation);
  }
});

annotator.annotations.update(id, patch, {
  source: "api",
  transactionId,
});

dispose();
```

- 用户完成一次拖动只产生一个最终、可持久化的 update 事件。
- tool 预览可以产生 `transient: true` 的事件，但不得进入持久化历史。
- undo/redo 使用 `source: "history"`，保留原 transaction 的关联信息。
- 批量导入使用统一 `transactionId`，消费者可以按批保存或审计。
- 事件 handler 的异常不能中断其他订阅者，但必须进入可注入的错误报告通道。

### 6.8 兼容与废弃策略

| 当前接口                                | 兼容期行为                      | 1.0 目标                          |
| --------------------------------------- | ------------------------------- | --------------------------------- |
| `addAnnotation(annotation)`             | 代理到 `annotations.add`        | deprecated，可在下一主版本删除    |
| `updateAnnotation(id, annotation)`      | 转成规范化 patch，重算 bounds   | `annotations.update(id, patch)`   |
| `removeAnnotation` / `deleteAnnotation` | 都代理到 `annotations.remove`   | 只保留 `annotations.remove`       |
| `store.addAll(annotations, true)`       | 代理到 `annotations.replaceAll` | `annotations.replaceAll`          |
| `setSelected(id)`                       | 代理到 `selection.set`          | 使用 `selection` controller       |
| `annotator.state`                       | 保留只读兼容视图并告警          | 高级接口改名为 `unsafeState`      |
| 旧事件名                                | 由新事件系统桥接发送            | 使用带 namespace 的类型化事件     |
| 根入口 React 导出                       | 移至 `annota/legacy-react`       | 从 `annota/react` 导入            |
| 调用方传入 `bounds`                     | 接受但忽略并重算                | `AnnotationInput` 不包含 `bounds` |
| `properties.layer`                      | 规范化时映射到 `layerId`        | 使用 `AnnotationInput.layerId`    |
| `getIntersecting(bounds)`               | 标记为候选查询并代理到 spatial  | `spatial.search(bounds)`          |

每个 deprecated API 都必须提供替代示例、首次废弃版本和计划删除版本。发布流程
不得在没有 migration guide 和 consumer fixture 的情况下删除兼容入口。

## 7. 分阶段实施

### 7.1 版本里程碑

| 里程碑       | 包含任务 | 交付目标                                          | 兼容要求                                        |
| ------------ | -------- | ------------------------------------------------- | ----------------------------------------------- |
| `0.11.x`     | 001—005  | 生命周期、Store、通用 Mask、最小 CI、usage audit  | 不删除旧 API；Store/Loader 行为变化提供兼容包装 |
| `0.12.x`     | 006—011  | 类型化事件、façade、normalization、三条集成测试链 | 新旧 API 并存，旧入口只做代理                   |
| `1.0.0`      | 012—014  | 包边界、完整 CI、迁移文档和 API 冻结              | consumer fixture 证明升级路径可用               |
| 1.0 后续优化 | 015—016  | 性能基线、文档站体积与 sitemap                    | 不阻塞 API 正确性和 1.0 发布                    |

`refactor-015` 只有在 README 继续保留具体帧率和标注规模承诺时才阻塞 1.0；
若删除这些数字，可在 1.0 后补充 benchmark。`refactor-016` 不阻塞 1.0。

### 7.2 任务分解

| 阶段 | 任务 ID        | 交付内容                                           | 依赖                    | 验收摘要                                                  |
| ---- | -------------- | -------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| A    | `refactor-001` | Annotator 生命周期与 disposer 收口                 | 无                      | observer、handler、timer、RAF 全部对称且销毁幂等          |
| A    | `refactor-002` | Store 批量写入契约                                 | 无                      | insert/upsert/replace 原子且有直接单元测试                |
| A    | `refactor-003` | 通用 instance mask decoder、注入映射和错误模型     | 无                      | decodePixel/mapProperties、失败路径和 OpenCV 释放有测试   |
| A    | `refactor-004` | 最小 PR CI                                         | 无                      | PR 强制通过 install、typecheck、Vitest、build             |
| A    | `refactor-005` | Manager 注入与病理耦合 usage audit                 | 无                      | 形成消费方、病理 helper 和扩展点清单                      |
| B    | `refactor-006` | 类型化事件、拖动事务和第三方边界                   | 001、002                | source、transaction、transient 和最终事件语义完整         |
| B    | `refactor-007` | 分域 façade、Layer/Spatial/Geometry 和只读状态边界 | 002、006                | 通用能力分域，写入进入同一 command/transaction 管线       |
| B    | `refactor-008` | AnnotationInput、layerId、normalization 与 patch   | 002、003、006、007      | bounds 统一计算，properties 只透传，loader/layer 映射明确 |
| B    | `refactor-009` | 生命周期真实集成测试                               | 001、006                | Viewer → Annotator 创建、取消和销毁链得到验证             |
| B    | `refactor-010` | 核心、Layer、Spatial/Geometry 与渲染集成测试       | 002、003、006、007、008 | 完整状态链、绘制顺序、候选与精确几何得到验证              |
| B    | `refactor-011` | React/Svelte 生命周期集成测试                      | 009、010                | Strict Mode、路由切换和异步卸载行为一致                   |
| C    | `refactor-012` | 公共 exports、正式扩展点和病理 helper 边界整理     | 005、007、011           | 子入口独立，核心无病理契约，正式扩展点完整                |
| C    | `refactor-013` | 完整 CI 与 package consumer 测试                   | 011、012                | ESM、CJS、React、Svelte、CSS 和 browser 集成进入门禁      |
| C    | `refactor-014` | README、领域边界、API、迁移与贡献指南同步          | 012、013                | 病理是 use case 而非核心模型，示例与实际导出一致          |
| D    | `refactor-015` | 可复现性能基线或删除性能承诺                       | 010                     | benchmark 可复现，或 README 不再包含无依据数字            |
| D    | `refactor-016` | 文档站体积和 sitemap 整理                          | 014                     | 关键页面按需加载，生产 sitemap 正常生成                   |

### 7.3 CI 分两步引入

最小 CI 在 `refactor-004` 完成，不等待新测试或 API 重构：

```text
pull request
  → pnpm install --frozen-lockfile
  → pnpm typecheck
  → pnpm exec vitest run
  → pnpm build
```

`refactor-013` 在真实集成测试和新 package exports 完成后扩展：

```text
最小 CI
  → browser lifecycle tests
  → React/Svelte integration tests
  → pnpm pack
  → ESM/CJS/React/Svelte/CSS consumer builds
```

CI 扩展只能增加门禁，不能替换或放宽最小 CI。

### 7.4 关键任务验收细则

`refactor-001`：

- Strict Mode 双挂载后不存在重复 observer 或 viewer handler。
- 路由切换、初始化中途卸载、同一 viewer 重建 annotator 均无残留资源。
- 连续调用两次 `destroy()` 不抛错且不重复销毁底层资源。
- 待执行 `pointerMoveRafId`、`dragRafId` 和 timer 均被取消。

`refactor-002`：

- 必须新增 `test/core/store.test.ts`。
- 覆盖 insert、upsert、replace、批内重复 ID、事件分类和异常原子性。
- 每个操作后 Map 与 SpatialIndex 中的 ID、annotation 和数量保持一致。

`refactor-003`：

- loader 核心只处理通用 pixel、instance、attributes、polygon 和 decoded region；
  0.11 通过兼容 adapter 输出当前 Annotation。
- `decodePixel` 能复现 R/G 组合 16 位 ID、B 通道 classId，但核心不解释 classId。
- `mapProperties` 能将通用 attributes 映射为任意泛型业务 properties。
- 无 `mapProperties` 时输出不包含 `cell`、`nucleus`、`cancer` 等领域字段。
- 正式 `AnnotationInput[]` 接入由依赖本任务的 `refactor-008` 完成。
- 覆盖 RGB/RGBA、实例 ID 小于/大于 256、空图和损坏 PNG。
- OpenCV 未就绪、轮廓提取失败和格式错误具有可区分的错误结果。
- `Mat`、`MatVector`、`approx` 和 `contours.get(i)` 返回的 contour 均得到释放。

`refactor-006`：

- N 次 drag preview 可以产生 transient 事件，但只产生一次最终 update。
- 一次拖动只生成一个 undo step；取消拖动不生成最终持久化事件。
- 兼容旧事件与新事件来自同一内部事务，不产生两次业务副作用。

`refactor-005` 和 `refactor-012`：

- audit 必须检索本 monorepo、公开示例和已知消费方。
- 每个 manager 注入点记录使用位置、实际用途和可替代能力。
- 盘点 `createPositiveMaskFilter`、`createNegativeMaskFilter`、
  `createMaskPolarityFilter`、BC Cell loader 默认值和病理专用 properties。
- 只有 audit 证明需要的注入点才升级为正式扩展契约；其余接口走兼容废弃流程。
- 领域 helper 要么由通用 property/filter/loader 原语替代，要么迁移到应用、示例
  或可选扩展入口；核心不得保留隐式病理契约。

`refactor-007`：

- façade 明确提供 annotations、layers、spatial、geometry、selection、history、
  events 和 tools 能力域。
- Layer 的 zIndex、opacity、visible、locked 和稳定排序符合第 6.4 节。
- `spatial.search` 只承诺候选查询；Geometry 承担精确关系和 polygon 操作。
- `zIndex`、Geometry 结果和 `properties` 均不被核心解释为业务优先级或领域关系。

`refactor-008`：

- `layerId` 成为 Annotation 的一等通用字段。
- 兼容 `properties.layer`，但 normalization 后不维护两个可分歧的数据源。
- 泛型 properties 在 add、update、loader、event 和只读快照中无损透传。
- `refactor-003` 的通用 mask decoder 通过 adapter 接入 AnnotationInput normalization，
  不再由 loader 自行构造带 bounds 的存储对象。
- 外部传入的错误 bounds 不能污染 SpatialIndex。

`refactor-010`：

- 验证 Layer 可见性同时影响 rendering、hover、hit test 和框选。
- 验证 Layer opacity 与 fill/stroke/image opacity 的组合计算。
- 验证 zIndex 和同层顺序稳定，update 不会隐式改变顺序。
- 验证 spatial 候选可能包含几何不相交对象，Geometry 能给出精确结果。
- 验证 merge/split/intersects/contains/IoU 不读取或修改业务 properties。

`refactor-014`：

- README 明确“病理是主要 use case，但 Annota 核心领域无关”。
- 文档分别解释 OpenSeadragon、Annota 和 Domain 的职责。
- 病理示例通过泛型 properties、Layer 配置和 loader 映射组合，不暗示核心认识
  cell、nucleus 或 diagnosis。

`refactor-006`、`refactor-007`、`refactor-008` 会共同修改
`src/adapters/openseadragon/annotator.ts` 和公共类型，因此通过依赖关系串行执行。
生命周期、核心状态和框架集成测试分别落在 009、010、011，禁止重新合并成一个
无法独立验证的大任务。

每个任务实施前应在 `docs/plan/tasks/` 创建独立任务文件。阶段内任务只有在
`path` 不重叠且 `depends-on` 全部完成时才能并行。

## 8. 任务验收模板

每项任务至少包含：

```yaml
id: refactor-NNN
scope: annota
status: pending
depends-on: []
```

并明确以下内容：

- **objective**：一个可以独立验证的交付目标。
- **context**：本方案和相关模块设计文档。
- **path**：允许修改的代码、测试和文档路径。
- **verification**：必须执行的命令和行为断言。

通用验证命令：

```bash
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm --dir docs build
pnpm pack --pack-destination <临时目录>
```

涉及包边界的任务还必须在临时 consumer fixture 中验证 ESM、CJS、React 和
Svelte 导入。涉及 WebGL 或浏览器生命周期的任务必须运行浏览器集成测试。

## 9. 完成定义

本轮重构只有同时满足以下条件才算完成：

- 所有资源注册均存在对称、幂等且有测试的清理路径。
- store 批量操作和 loader 失败行为形成稳定契约。
- Instance mask 通过 `decodePixel` 无损提取 ID/attributes，通过 `mapProperties`
  注入领域映射；无映射时核心输出不包含病理语义。
- 稳定公共写入只经过分域 façade 和统一 command/transaction 管线。
- Annotation bounds 只由 normalization 生成，调用者不能使几何与索引边界失配。
- Annotation 使用一等 `layerId`；兼容 `properties.layer` 但不存在双重状态。
- Layer 的 zIndex、opacity、visible、locked 和稳定排序具有跨渲染/交互的一致契约。
- Spatial API 明确只返回 bounds 候选，Geometry API 提供精确关系与 polygon 操作。
- 核心类型、事件、loader、filter、layer 和 geometry 不解释病理字段或业务关系。
- 变更事件包含类型化 payload、source、transactionId 和 transient 语义。
- 内部状态不再是默认公共操作路径；正式 manager 注入点有完整 contract tests。
- manager 注入点已经过真实消费方 usage audit，保留与收缩决定有证据可追溯。
- 核心模块、框架适配和包入口的关键调用链均有自动化测试。
- 最小 PR CI 在 0.11 阶段成为合并门禁，1.0 前扩展为 browser 和 consumer 门禁；
  发布 workflow 不再是唯一验证入口。
- React 与 Svelte 的依赖和入口边界清晰。
- 所有 deprecated API 都有兼容代理、替代示例和计划删除版本。
- README、API 文档、贡献指南和代码行为一致。
- README 中的性能数字具备固定数据集、脚本、环境说明和基线结果，或者已经删除。
- 全量类型检查、测试、库构建、文档构建和 consumer 构建全部通过。

## 10. 风险与迁移策略

| 风险                                 | 控制方式                                             |
| ------------------------------------ | ---------------------------------------------------- |
| 清理顺序变化导致卸载竞态             | destroyed guard、disposer 逆序执行、Strict Mode 测试 |
| Store 契约变化影响现有调用者         | 保留旧签名、增加 deprecated 提示、主版本再删除       |
| Loader 错误从空数组变为异常          | 提供兼容包装器，并在 release notes 明确迁移方式      |
| BC Cell 默认解码迁移后调用方丢失类别 | 提供等价 decodePixel/mapProperties 示例和兼容 preset |
| façade 分组导致现有调用方式失效      | 旧扁平方法只做代理，至少跨一个小版本保留             |
| 重算 bounds 改变依赖错误边界的结果   | 增加兼容告警和几何/空间索引回归测试                  |
| `properties.layer` 迁移造成归属分歧  | normalization 单向映射到 layerId，禁止双写           |
| 精确 Geometry 被误用于全量扫描       | 文档要求先 spatial 候选再精确计算，并建立性能测试    |
| 领域 helper 迁移影响病理消费方       | usage audit、通用替代 API、deprecated 兼容入口       |
| state 收紧影响高级集成               | 先提供只读兼容视图和明确的 `unsafeState` 迁移入口    |
| manager 注入点被收缩                 | 盘点实际使用者，正式扩展点提供 contract suite        |
| 包入口调整造成导入失败               | 先新增子入口和 consumer 测试，再逐步迁移文档         |
| 最小 CI 暴露已有不稳定测试           | 先修复确定性问题，不允许通过降低断言或跳过测试绕过   |
| 里程碑之间长期维护两套 API           | 旧入口只做代理，新旧接口共享实现和测试               |
| Benchmark 在 CI 中波动               | CI 使用宽松阈值，正式数据在固定环境采集              |
| 重构期间行为被顺手改变               | 每个任务限制 path，并以现有用户行为作为回归基线      |

## 11. 推荐起点

第一批启动 `refactor-001`、`refactor-002`、`refactor-003`、`refactor-004`
和 `refactor-005`。其中 001—003 分别解决生命周期、状态契约和数据正确性；
004 立即建立最小 PR 门禁；005 以只读方式盘点 manager、病理 helper 和领域字段的
实际使用者。

001—005 的路径无重叠时可以并行，但每项必须独立验证。完成后按
006 → 007 → 008 的顺序串行收紧事件、façade 和 Annotation 契约，同时分别推进
009、010、011 三条真实集成测试链。只有这些连接路径通过后，才开始 1.0 包边界
和迁移工作。
