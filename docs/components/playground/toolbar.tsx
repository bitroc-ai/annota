import {
  Hand,
  CircleDot,
  Wand2,
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
  Image,
  LineSquiggle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAnnotator,
  useViewer,
  useHistory,
  useSelection,
  containsPoint,
  downloadJson,
  exportJson,
  canMergeAnnotations,
} from "annota";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ToolType =
  | "pan"
  | "point"
  | "rectangle"
  | "polygon"
  | "curve"
  | "sam"
  | "push"
  | "split";

interface AnnotationToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  viewer?: any;
  samInitialized?: boolean;
  layerPanel: React.ReactElement;
}

interface GeneralToolbarProps {
  viewer?: any;
}

/**
 * Annotation Toolbar - Vertical toolbar on left side
 * Contains drawing tools and annotation operations
 */
export function AnnotationToolbar({
  tool,
  onToolChange,
  viewer,
  samInitialized = false,
  layerPanel,
}: AnnotationToolbarProps) {
  const annotator = useAnnotator();
  const selectedAnnotations = useSelection();

  const handleAddImageAnnotation = () => {
    if (!annotator || !viewer) return;

    // Get center of viewport
    const viewport = viewer.viewport;
    const center = viewport.getCenter();
    const imageCenter = viewport.viewportToImageCoordinates(center);

    // Create a 64x64 sample image annotation with a gradient
    // Generate a simple gradient as base64 PNG
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create gradient (red to transparent)
    const gradient = ctx.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, "rgba(255, 100, 100, 0.7)");
    gradient.addColorStop(1, "rgba(100, 100, 255, 0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    // Add some text
    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Analysis", 32, 28);
    ctx.fillText("Result", 32, 42);

    const imageData = canvas.toDataURL("image/png");

    // Create image annotation (64x64 to match canvas size)
    const annotation = {
      id: `image-${Date.now()}`,
      shape: {
        type: "image" as const,
        x: imageCenter.x - 32,
        y: imageCenter.y - 32,
        width: 64,
        height: 64,
        url: imageData,
        opacity: 0.6,
        bounds: {
          minX: imageCenter.x - 32,
          minY: imageCenter.y - 32,
          maxX: imageCenter.x + 32,
          maxY: imageCenter.y + 32,
        },
      },
      properties: {
        type: "analysis_result",
        analysisType: "sample",
        timestamp: Date.now(),
        note: "This is a sample image annotation showing how analysis results can be overlaid on the slide",
      },
    };

    annotator.state.store.add(annotation);
    toast.success("Added sample image annotation at viewport center");
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
      .map((id) => annotator.state.store.get(id))
      .filter((ann) => ann !== undefined);

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

  const handleAutoAssignMasks = () => {
    if (!annotator) return;

    // Get all annotations
    const allAnnotations = annotator.state.store.all();

    // Separate points and masks
    const pointAnnotations = allAnnotations.filter(
      (ann) => ann.shape.type === "point"
    );
    const maskAnnotations = allAnnotations.filter(
      (ann) =>
        ann.shape.type === "polygon" ||
        ann.shape.type === "multipolygon" ||
        ann.shape.type === "path"
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

      // Assign classification based on contained points (positive wins if both)
      const currentClassification = mask.properties?.classification;
      let newClassification: "positive" | "negative" | undefined =
        currentClassification;

      if (hasPositive) {
        newClassification = "positive";
      } else if (hasNegative) {
        newClassification = "negative";
      }

      // Update the mask if classification changed
      if (newClassification !== currentClassification) {
        annotator.updateAnnotation(mask.id, {
          ...mask,
          properties: {
            ...mask.properties,
            classification: newClassification,
          },
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

  return (
    <Card className="p-2 backdrop-blur-sm bg-white/95 dark:bg-slate-950/95">
      <div className="flex flex-col items-center gap-1">
        {/* Drawing Tools */}
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
          variant={tool === "curve" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("curve")}
          className={cn(
            "w-9 h-9",
            tool === "curve" && "bg-blue-600 hover:bg-blue-700"
          )}
          title="Draw smooth curves (freehand)"
        >
          <LineSquiggle className="w-4 h-4" />
        </Button>
        {/* Push tool disabled - will be redesigned as Magnet tool
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
        */}
        <Button
          variant={tool === "sam" ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange("sam")}
          disabled={!samInitialized}
          className={cn(
            "w-9 h-9",
            tool === "sam" && "bg-purple-600 hover:bg-purple-700"
          )}
          title={
            samInitialized
              ? "SAM Segmentation (click on objects)"
              : "SAM Initializing..."
          }
        >
          {samInitialized ? (
            <Wand2 className="w-4 h-4" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
        </Button>{" "}
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
        {/* Divider */}
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
        {/* Annotation Operations */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddImageAnnotation}
          disabled={!annotator || !viewer}
          className="w-9 h-9 hover:bg-purple-50 dark:hover:bg-purple-950/20 disabled:opacity-50"
          title="Add sample image annotation (analysis result overlay)"
        >
          <Image className="w-4 h-4 text-purple-600 dark:text-purple-500" />
        </Button>
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
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAutoAssignMasks}
          className="w-9 h-9 hover:bg-purple-50 dark:hover:bg-purple-950/20"
          title="Auto-assign masks to layers based on contained points"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
        </Button>
        {/* Divider */}
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
        {/* Layer Panel */}
        {layerPanel}
      </div>
    </Card>
  );
}

/**
 * General Toolbar - Horizontal toolbar at bottom right
 * Contains zoom, undo/redo, export, and clear operations
 */
export function GeneralToolbar({ viewer }: GeneralToolbarProps) {
  const annotator = useAnnotator();
  const viewerControls = useViewer(viewer);
  const history = useHistory();

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

  return (
    <Card className="p-2 backdrop-blur-sm bg-white/95 dark:bg-slate-950/95">
      <div className="flex flex-row items-center gap-1">
        {/* Zoom Controls */}
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

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* History Controls */}
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

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* File Operations */}
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

// Keep the old component name as an alias for backwards compatibility
export const DemoToolbar = AnnotationToolbar;
