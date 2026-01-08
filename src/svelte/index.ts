// Core Svelte Exports

export { default as AnnotaProvider } from "./components/Provider.svelte";
export { default as Annotator } from "./components/Annotator.svelte";
export { default as Viewer } from "./components/Viewer.svelte";
export { default as Popup } from "./components/Popup.svelte";
export { default as ContextMenu } from "./components/ContextMenu.svelte";
export { default as ContextMenuItem } from "./components/ContextMenuItem.svelte";
export { default as ContextMenuDivider } from "./components/ContextMenuDivider.svelte";
export { default as AnnotationEditor } from "./components/AnnotationEditor.svelte";

// Utilities
export { getAnnotator, setAnnotator } from "./annotator";
export { tool } from "./tool.svelte";
export { pushToolCursor } from "./pushToolCursor.svelte";
export { contextMenu } from "./contextMenu.svelte";
export { contextMenuBinding } from "./contextMenuBinding.svelte";
export { selection } from "./selection.svelte";
export { editing } from "./editing.svelte";
export { viewer } from "./viewer-utils.svelte";
export { history } from "./history.svelte";
export { layers } from "./layers.svelte";
export { layerManager } from "./layerManager.svelte";
export { annotations } from "./annotations.svelte";

// Re-export core types that are shared
export type {
  Annotation,
  AnnotationStyle,
  Shape,
  ShapeType
} from "../core/types";
