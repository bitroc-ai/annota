import {
  Hand,
  CircleDot,
  Wand,
  Mouse,
  Eraser,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
  Pentagon,
  Undo,
  Redo,
  Sparkles,
  FileJson,
  Scissors,
  Merge,
} from "lucide-react";
import { toast } from "sonner";
import { useAnnotator, useViewer, useHistory, useSelection, containsPoint, downloadJson, exportJson, canMergeAnnotations } from "annota";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ToolType =
  | "pan"
  | "point"
  | "rectangle"
  | "polygon"
  | "cell-detect"
  | "push"
  | "split";

interface DemoToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  viewer?: any;
  layerPanel: React.ReactElement;
}

export function DemoToolbar({
  tool,
  onToolChange,
  viewer,
  layerPanel,
}: DemoToolbarProps) {
  const annotator = useAnnotator();
  const viewerControls = useViewer(viewer);
  const history = useHistory();
  const selectedAnnotations = useSelection();

  const handleClearAll = () => {
    if (!annotator) return;
    const annotations = annotator.state.store.all();
    if (annotations.length === 0) {
      toast.info("No annotations to clear");
      return;
    }
    if (confirm(`Clear all ${annotations.length} annotation(s)?`)) {
      annotator.clearAnnotations();
      toast.success("All annotations cleared");
    }
  };

  const handleAutoAssignMasks = () => {
    if (!annotator) return;

    // Get all annotations
    const allAnnotations = annotator.state.store.all();

    // Separate points and masks
    const pointAnnotations = allAnnotations.filter(
      (ann) => ann.shape.type === "point"
    );
    const maskAnnotations = allAnnotations.filter(
      (ann) => ann.shape.type === "polygon" || ann.shape.type === "multipolygon"
    );

    if (maskAnnotations.length === 0) {
      toast.info("No mask annotations to assign");
      return;
    }

    if (pointAnnotations.length === 0) {
      toast.info("No point annotations found");
      return;
    }

    let assignedCount = 0;

    // For each mask, check which points it contains
    maskAnnotations.forEach((mask) => {
      let hasPositive = false;
      let hasNegative = false;

      // Check each point to see if it's inside this mask
      pointAnnotations.forEach((point) => {
        if (point.shape.type !== "point") return;

        const isInside = containsPoint(
          mask.shape,
          point.shape.point.x,
          point.shape.point.y
        );

        if (isInside) {
          const category = point.properties?.category;
          if (category === "positive") {
            hasPositive = true;
          } else if (category === "negative") {
            hasNegative = true;
          }
        }
      });

      // Assign maskPolarity based on contained points (positive wins if both)
      const currentPolarity = mask.maskPolarity;
      let newPolarity: "positive" | "negative" | undefined = currentPolarity;

      if (hasPositive) {
        newPolarity = "positive";
      } else if (hasNegative) {
        newPolarity = "negative";
      }

      // Update the mask if polarity changed
      if (newPolarity !== currentPolarity) {
        annotator.updateAnnotation(mask.id, {
          ...mask,
          maskPolarity: newPolarity,
        });
        assignedCount++;
      }
    });

    if (assignedCount > 0) {
      toast.success(`Auto-assigned ${assignedCount} mask(s) to layers`);
    } else {
      toast.info("All masks already correctly assigned");
    }
  };

  const handleExportJson = () => {
    if (!annotator) return;
    const annotations = annotator.state.store.all();
    if (annotations.length === 0) {
      toast.info("No annotations to export");
      return;
    }
    const json = exportJson(annotations);
    downloadJson(json, "annotations.geojson");
    toast.success(`Exported ${annotations.length} annotations to JSON`);
  };

  const handleMerge = () => {
    if (!annotator) return;

    const selectedIds = annotator.state.selection.getSelected();
    if (selectedIds.length < 2) {
      toast.info("Select 2 or more annotations to merge");
      return;
    }

    // Get selected annotations
    const annotations = selectedIds
      .map(id => annotator.state.store.get(id))
      .filter(ann => ann !== undefined);

    // Check if can merge
    if (!canMergeAnnotations(annotations as any[])) {
      toast.error("Cannot merge selected annotations (incompatible types)");
      return;
    }

    // Perform merge
    const merged = annotator.mergeSelected();
    if (merged) {
      toast.success(`Merged ${selectedIds.length} annotations into one`);
    } else {
      toast.error("Failed to merge annotations");
    }
  };

  return (
    <Card className="p-2 backdrop-blur-sm bg-white/95 dark:bg-slate-950/95">
      <div className="flex flex-col items-center gap-1">
        <Button
          variant={tool === "pan" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("pan")}
          className="w-9 h-9"
          title="Pan and zoom"
        >
          <Hand className="w-4 h-4" />
        </Button>
        <Button
          variant={tool === "point" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("point")}
          className={cn(
            "w-9 h-9",
            tool === "point" && "bg-blue-600 hover:bg-blue-700"
          )}
          title="Add point markers"
        >
          <CircleDot className="w-4 h-4" />
        </Button>
        <Button
          variant={tool === "rectangle" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("rectangle")}
          className={cn(
            "w-9 h-9",
            tool === "rectangle" && "bg-blue-600 hover:bg-blue-700"
          )}
          title="Draw rectangles"
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          variant={tool === "polygon" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("polygon")}
          className={cn(
            "w-9 h-9",
            tool === "polygon" && "bg-blue-600 hover:bg-blue-700"
          )}
          title="Draw polygons (double-click to finish)"
        >
          <Pentagon className="w-4 h-4" />
        </Button>
        <Button
          variant={tool === "push" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("push")}
          className={cn(
            "w-9 h-9",
            tool === "push" && "bg-green-600 hover:bg-green-700"
          )}
          title="Push polygon vertices"
        >
          <Mouse className="w-4 h-4" />
        </Button>
        <Button
          variant={tool === "cell-detect" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("cell-detect")}
          className={cn(
            "w-9 h-9",
            tool === "cell-detect" && "bg-purple-600 hover:bg-purple-700"
          )}
          title="Detect edge"
        >
          <Wand className="w-4 h-4" />
        </Button>
        <Button
          variant={tool === "split" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("split")}
          className={cn(
            "w-9 h-9",
            tool === "split" && "bg-orange-600 hover:bg-orange-700"
          )}
          title="Split annotation with a line"
        >
          <Scissors className="w-4 h-4" />
        </Button>
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMerge}
          disabled={!annotator || selectedAnnotations.length < 2}
          className="w-9 h-9 hover:bg-blue-50 dark:hover:bg-blue-950/20 disabled:opacity-50"
          title="Merge selected annotations"
        >
          <Merge className="w-4 h-4 text-blue-600 dark:text-blue-500" />
        </Button>
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => viewerControls.zoomIn()}
          className="w-9 h-9"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => viewerControls.zoomOut()}
          className="w-9 h-9"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => viewerControls.zoomToFit()}
          className="w-9 h-9"
          title="Fit to screen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAutoAssignMasks}
          className="w-9 h-9 hover:bg-purple-50 dark:hover:bg-purple-950/20"
          title="Auto-assign masks to layers based on contained points"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
        </Button>
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={history.undo}
          disabled={!history.canUndo}
          className="w-9 h-9"
          title={`Undo ${history.canUndo ? `(${history.undoSize})` : ""}`}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={history.redo}
          disabled={!history.canRedo}
          className="w-9 h-9"
          title={`Redo ${history.canRedo ? `(${history.redoSize})` : ""}`}
        >
          <Redo className="w-4 h-4" />
        </Button>
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
        {layerPanel}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportJson}
          className="w-9 h-9 hover:bg-green-50 dark:hover:bg-green-950/20"
          title="Export annotations as GeoJSON"
        >
          <FileJson className="w-4 h-4 text-green-600 dark:text-green-500" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleClearAll}
          className="w-9 h-9 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="Clear all annotations"
        >
          <Eraser className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
