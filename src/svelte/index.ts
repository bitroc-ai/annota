// Core Svelte Exports

export { default as AnnotaProvider } from "./components/provider.svelte";
export { default as Annotator } from "./components/annotator.svelte";
export { default as Viewer } from "./components/viewer.svelte";
export { default as Popup } from "./components/popup.svelte";
export { default as ContextMenu } from "./components/context-menu.svelte";
export { default as ContextMenuItem } from "./components/context-menu-item.svelte";
export { default as AnnotationEditor } from "./components/annotation-editor.svelte";

// Utilities
export { getAnnotator, setAnnotator } from "./annotator";
export { tool } from "./tool.svelte";
export { pushToolCursor } from "./push-tool-cursor.svelte";
export { contextMenu } from "./context-menu.svelte";
export { contextMenuBinding } from "./context-menu-binding.svelte";
export { selection } from "./selection.svelte";
export { editing } from "./editing.svelte";
export { viewer } from "./viewer-utils.svelte";
export { history } from "./history.svelte";
export { layers } from "./layers.svelte";
export { layerManager } from "./layer-manager.svelte";
export { annotations } from "./annotations.svelte";

// Re-export core types that are shared
export type {
  Annotation,
  AnnotationStyle,
  Shape,
  ShapeType
} from "annota";
