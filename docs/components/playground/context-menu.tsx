"use client";

import { useCallback } from "react";
import {
  useAnnotator,
  useContextMenu,
  useContextMenuBinding,
  useEditing,
  getEditorConfig,
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
  type Annotation,
} from "annota";
import { toast } from "sonner";
import { CircleDot, SquareDot, Trash2, Edit3, SquareCheck, CircleCheck } from "lucide-react";

export function AnnotationContextMenu() {
  const annotator = useAnnotator();
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } =
    useContextMenu();
  const { startEditing, isEditing } = useEditing();

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

  const handleSetPositivePoint = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        category: "positive",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    toast.success("Set as positive point (include)");
    hideMenu();
  }, [menuState.annotation, annotator, hideMenu]);

  const handleSetNegativePoint = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        category: "negative",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    toast.success("Set as negative point (exclude)");
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

  const handleEditVertices = useCallback(() => {
    if (!menuState.annotation) return;

    startEditing(menuState.annotation.id);
    toast.success("Vertex editing mode enabled");
    hideMenu();
  }, [menuState.annotation, startEditing, hideMenu]);

  // Check annotation type
  const isMaskAnnotation =
    menuState.annotation &&
    (menuState.annotation.shape.type === "polygon" ||
      menuState.annotation.shape.type === "multipolygon");

  const isPointAnnotation =
    menuState.annotation && menuState.annotation.shape.type === "point";

  // Check current state for masks
  const isCurrentlyPositiveMask = !!(
    menuState.annotation?.maskPolarity === "positive" ||
    (isMaskAnnotation && !menuState.annotation?.maskPolarity)
  );

  const isCurrentlyNegativeMask = !!(
    menuState.annotation?.maskPolarity === "negative"
  );

  // Check current state for points
  const isCurrentlyPositivePoint = !!(
    menuState.annotation?.properties?.category === "positive"
  );
  const isCurrentlyNegativePoint = !!(
    menuState.annotation?.properties?.category === "negative"
  );

  // Check if annotation supports vertex editing
  const supportsVertexEditing = menuState.annotation
    ? getEditorConfig(menuState.annotation)?.supportsVertexEditing
    : false;

  const isCurrentlyEditing = menuState.annotation
    ? isEditing(menuState.annotation.id)
    : false;

  return (
    <ContextMenu position={menuState.position} onClose={hideMenu}>
      {menuState.type === "annotation" && menuState.annotation && (
        <>
          {isMaskAnnotation ? (
            <>
              <div className="annota-context-menu-header">Mask Actions</div>
              <ContextMenuItem
                label={
                  isCurrentlyPositiveMask
                    ? "Positive Mask"
                    : "Set as Positive Mask"
                }
                onClick={handleSetPositiveMask}
                icon={
                  isCurrentlyPositiveMask ? (
                    <SquareCheck className="w-4 h-4 text-green-500" />
                  ) : (
                    <SquareDot className="w-4 h-4 text-green-500" />
                  )
                }
                disabled={isCurrentlyPositiveMask}
              />
              <ContextMenuItem
                label={
                  isCurrentlyNegativeMask
                    ? "Negative Mask"
                    : "Set as Negative Mask"
                }
                onClick={handleSetNegativeMask}
                icon={
                  isCurrentlyNegativeMask ? (
                    <SquareCheck className="w-4 h-4 text-red-500" />
                  ) : (
                    <SquareDot className="w-4 h-4 text-red-500" />
                  )
                }
                disabled={isCurrentlyNegativeMask}
              />
              <ContextMenuDivider />
              <ContextMenuItem
                label="Delete Annotation"
                onClick={handleDelete}
                danger
                icon={<Trash2 className="w-4 h-4" />}
              />
            </>
          ) : isPointAnnotation ? (
            <>
              <div className="annota-context-menu-header">Point Actions</div>
              <ContextMenuItem
                label={
                  isCurrentlyPositivePoint
                    ? "Positive Point"
                    : "Set as Positive Point"
                }
                onClick={handleSetPositivePoint}
                icon={
                  isCurrentlyPositivePoint ? (
                    <CircleCheck className="w-4 h-4 text-green-500" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-green-500" />
                  )
                }
                disabled={isCurrentlyPositivePoint}
              />
              <ContextMenuItem
                label={
                  isCurrentlyNegativePoint
                    ? "Negative Point"
                    : "Set as Negative Point"
                }
                onClick={handleSetNegativePoint}
                icon={
                  isCurrentlyNegativePoint ? (
                    <CircleCheck className="w-4 h-4 text-red-500" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-red-500" />
                  )
                }
                disabled={isCurrentlyNegativePoint}
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
              <div className="annota-context-menu-header">
                Annotation Actions
              </div>
              {supportsVertexEditing && (
                <>
                  <ContextMenuItem
                    label={
                      isCurrentlyEditing
                        ? "Editing Vertices"
                        : "Edit Vertices"
                    }
                    onClick={handleEditVertices}
                    icon={<Edit3 className="w-4 h-4 text-blue-500" />}
                    disabled={isCurrentlyEditing}
                  />
                  <ContextMenuDivider />
                </>
              )}
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
