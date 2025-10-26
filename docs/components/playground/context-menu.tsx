"use client";

import { useCallback, useEffect } from "react";
import {
  useAnnotator,
  useContextMenu,
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
  createPositiveMaskFilter,
  createNegativeMaskFilter,
  type Annotation,
} from "annota";
import { toast } from "sonner";

// Add CSS variables for theme support
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --annota-context-menu-bg: #ffffff;
      --annota-context-menu-text: #000000;
      --annota-context-menu-border: #e0e0e0;
      --annota-context-menu-hover: rgba(0, 0, 0, 0.05);
      --annota-context-menu-divider: rgba(0, 0, 0, 0.1);
      --annota-context-menu-danger: #dc3545;
      --annota-context-menu-danger-hover: rgba(220, 53, 69, 0.1);
      --annota-context-menu-header: #64748b;
    }

    .dark {
      --annota-context-menu-bg: #1e293b;
      --annota-context-menu-text: #f1f5f9;
      --annota-context-menu-border: #334155;
      --annota-context-menu-hover: rgba(255, 255, 255, 0.1);
      --annota-context-menu-divider: rgba(255, 255, 255, 0.1);
      --annota-context-menu-danger: #ef4444;
      --annota-context-menu-danger-hover: rgba(239, 68, 68, 0.2);
      --annota-context-menu-header: #94a3b8;
    }
  `;
  document.head.appendChild(style);
}

export function ContextMenuDemo() {
  const annotator = useAnnotator();
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } =
    useContextMenu();

  // Handle right-click on viewer canvas
  useEffect(() => {
    if (!annotator?.viewer) return;

    const canvas = annotator.viewer.canvas;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      // Check if we clicked on an annotation
      const annotations = annotator.state.store.all();
      const clickPoint = {
        x: e.offsetX,
        y: e.offsetY,
      };

      // Find annotation at click point
      // For simplicity, we'll use the hovered annotation if available
      const hoveredId = annotator.state.hover.current;
      const hoveredAnnotation = hoveredId
        ? annotator.state.store.get(hoveredId)
        : undefined;

      if (hoveredAnnotation) {
        // Show annotation context menu
        showAnnotationMenu(hoveredAnnotation, e.clientX, e.clientY);
      } else {
        // Show viewer context menu
        showViewerMenu(e.clientX, e.clientY);
      }
    };

    canvas?.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas?.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [annotator, showViewerMenu, showAnnotationMenu]);

  const handleSetPositiveMask = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      maskPolarity: "positive",
      properties: {
        ...menuState.annotation.properties,
        layer: "positive-masks",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    toast.success("Set as positive mask (include)");
    hideMenu();
  }, [menuState.annotation, annotator, hideMenu]);

  const handleSetNegativeMask = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      maskPolarity: "negative",
      properties: {
        ...menuState.annotation.properties,
        layer: "negative-masks",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    toast.success("Set as negative mask (exclude)");
    hideMenu();
  }, [menuState.annotation, annotator, hideMenu]);

  const handleDelete = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    annotator.deleteAnnotation(menuState.annotation.id);
    toast.success("Annotation deleted");
    hideMenu();
  }, [menuState.annotation, annotator, hideMenu]);

  const handleClearAll = useCallback(() => {
    if (!annotator) return;

    annotator.clearAnnotations();
    toast.success("All annotations cleared");
    hideMenu();
  }, [annotator, hideMenu]);

  const handleCreatePositiveLayer = useCallback(() => {
    if (!annotator) return;

    try {
      annotator.createLayer("positive-masks", {
        name: "Positive Masks",
        visible: true,
        opacity: 0.6,
        zIndex: 10,
        filter: createPositiveMaskFilter(),
      });
      toast.success("Created positive masks layer");
    } catch (error) {
      toast.error("Layer already exists");
    }
    hideMenu();
  }, [annotator, hideMenu]);

  const handleCreateNegativeLayer = useCallback(() => {
    if (!annotator) return;

    try {
      annotator.createLayer("negative-masks", {
        name: "Negative Masks",
        visible: true,
        opacity: 0.6,
        zIndex: 11,
        filter: createNegativeMaskFilter(),
      });
      toast.success("Created negative masks layer");
    } catch (error) {
      toast.error("Layer already exists");
    }
    hideMenu();
  }, [annotator, hideMenu]);

  return (
    <ContextMenu position={menuState.position} onClose={hideMenu}>
      {menuState.type === "annotation" && menuState.annotation && (
        <>
          <div
            className="px-3 py-2 text-xs font-semibold"
            style={{ color: 'var(--annota-context-menu-header, #64748b)' }}
          >
            Annotation Actions
          </div>
          <ContextMenuItem
            label="Set as Positive Mask"
            onClick={handleSetPositiveMask}
            icon={
              <span className="w-3 h-3 rounded-full bg-green-500" />
            }
          />
          <ContextMenuItem
            label="Set as Negative Mask"
            onClick={handleSetNegativeMask}
            icon={
              <span className="w-3 h-3 rounded-full bg-red-500" />
            }
          />
          <ContextMenuDivider />
          <ContextMenuItem
            label="Delete Annotation"
            onClick={handleDelete}
            danger
            icon={<span>🗑️</span>}
          />
        </>
      )}
      {menuState.type === "viewer" && (
        <>
          <div
            className="px-3 py-2 text-xs font-semibold"
            style={{ color: 'var(--annota-context-menu-header, #64748b)' }}
          >
            Layer Actions
          </div>
          <ContextMenuItem
            label="Create Positive Masks Layer"
            onClick={handleCreatePositiveLayer}
            icon={<span className="w-3 h-3 rounded-full bg-green-500" />}
          />
          <ContextMenuItem
            label="Create Negative Masks Layer"
            onClick={handleCreateNegativeLayer}
            icon={<span className="w-3 h-3 rounded-full bg-red-500" />}
          />
          <ContextMenuDivider />
          <ContextMenuItem
            label="Clear All Annotations"
            onClick={handleClearAll}
            danger
            icon={<span>🗑️</span>}
          />
        </>
      )}
    </ContextMenu>
  );
}
