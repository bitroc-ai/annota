"use client";

import { useCallback } from "react";
import {
  useAnnotator,
  useContextMenu,
  useContextMenuBinding,
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
  type Annotation,
} from "annota";
import { toast } from "sonner";
import { SquareDot, Trash2 } from "lucide-react";

export function AnnotationContextMenu() {
  const annotator = useAnnotator();
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } =
    useContextMenu();

  // Automatically bind context menu to viewer canvas
  useContextMenuBinding(showViewerMenu, showAnnotationMenu);

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

  // Check if annotation is a mask (polygon or multipolygon)
  const isMaskAnnotation = menuState.annotation &&
    (menuState.annotation.shape.type === "polygon" ||
     menuState.annotation.shape.type === "multipolygon");

  return (
    <ContextMenu position={menuState.position} onClose={hideMenu}>
      {menuState.type === "annotation" && menuState.annotation && (
        <>
          {isMaskAnnotation ? (
            <>
              <div className="annota-context-menu-header">Mask Actions</div>
              <ContextMenuItem
                label="Set as Positive Mask"
                onClick={handleSetPositiveMask}
                icon={<SquareDot className="w-4 h-4 text-green-500" />}
              />
              <ContextMenuItem
                label="Set as Negative Mask"
                onClick={handleSetNegativeMask}
                icon={<SquareDot className="w-4 h-4 text-red-500" />}
              />
              <ContextMenuDivider />
              <ContextMenuItem
                label="Delete Annotation"
                onClick={handleDelete}
                danger
                icon={<Trash2 className="w-4 h-4" />}
              />
            </>
          ) : (
            <>
              <div className="annota-context-menu-header">Annotation Actions</div>
              <ContextMenuItem
                label="Delete Annotation"
                onClick={handleDelete}
                danger
                icon={<Trash2 className="w-4 h-4" />}
              />
            </>
          )}
        </>
      )}
      {menuState.type === "viewer" && (
        <>
          <div className="annota-context-menu-header">Viewer Actions</div>
          <ContextMenuItem
            label="Clear All Annotations"
            onClick={handleClearAll}
            danger
            icon={<Trash2 className="w-4 h-4" />}
          />
        </>
      )}
    </ContextMenu>
  );
}
