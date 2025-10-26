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

export function AnnotationContextMenu() {
  const annotator = useAnnotator();
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } =
    useContextMenu();

  // Handle right-click on viewer canvas
  useEffect(() => {
    if (!annotator?.viewer) return;

    const canvas = annotator.viewer.canvas;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      // Use the hovered annotation if available
      const hoveredId = annotator.state.hover.current;
      const hoveredAnnotation = hoveredId
        ? annotator.state.store.get(hoveredId)
        : undefined;

      if (hoveredAnnotation) {
        showAnnotationMenu(hoveredAnnotation, e.clientX, e.clientY);
      } else {
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
          <div className="annota-context-menu-header">
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
          <div className="annota-context-menu-header">
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
