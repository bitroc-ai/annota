// Core Svelte Exports

export { default as AnnotaProvider } from "./components/Provider.svelte";
export { default as Annotator } from "./components/Annotator.svelte";
export { default as Viewer } from "./components/Viewer.svelte";
export { default as Popup } from "./components/Popup.svelte";
export { default as ContextMenu } from "./components/ContextMenu.svelte";
export { default as ContextMenuItem } from "./components/ContextMenuItem.svelte";
export { default as ContextMenuDivider } from "./components/ContextMenuDivider.svelte";

// Utilities
export { getAnnotator, setAnnotator } from "./annotator";
export * from "./tool.svelte";
export * from "./pushToolCursor.svelte";
export * from "./contextMenu.svelte";
export * from "./contextMenuBinding.svelte";
export * from "./selection.svelte";
export * from "./editing.svelte";
export * from "./viewer.svelte";
export * from "./history.svelte";
export * from "./layers.svelte";
export * from "./layerManager.svelte";
export * from "./annotations.svelte";

// Re-export core types that are shared
export type {
  Annotation,
  AnnotationStyle,
  Shape,
  ShapeType
} from "../core/types";
