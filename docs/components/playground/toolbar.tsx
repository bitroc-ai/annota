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
} from "lucide-react";
import { toast } from "sonner";
import { useAnnotator, useViewer } from "annota";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ToolType =
  | "pan"
  | "point"
  | "rectangle"
  | "polygon"
  | "cell-detect"
  | "push";

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

  const handleClearAll = () => {
    if (!annotator) return;
    const annotations = annotator.state.store.all();
    if (annotations.length === 0) {
      toast.info("No annotations to clear");
      return;
    }
    if (confirm(`Clear all ${annotations.length} annotation(s)?`)) {
      annotations.forEach((annotation) =>
        annotator.state.store.delete(annotation.id)
      );
      toast.success("All annotations cleared");
    }
  };

  return (
    <Card className="p-2 backdrop-blur-sm bg-card/95">
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
          title="Detect cell edge"
        >
          <Wand className="w-4 h-4" />
        </Button>
        <div className="h-px w-8 bg-border my-1" />
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
        <div className="h-px w-8 bg-border my-1" />
        {layerPanel}
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
