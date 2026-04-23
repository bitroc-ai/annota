import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type OpenSeadragon from "openseadragon";
import {
  AnnotaProvider,
  AnnotaViewer,
  Annotator,
  AnnotationEditor,
  ContextMenu,
  ContextMenuDivider,
  ContextMenuItem,
  CurveTool,
  PointTool,
  PolygonTool,
  PushTool,
  RectangleTool,
  SamTool,
  SplitTool,
  canMergeAnnotations,
  containsPoint,
  downloadJson,
  exportJson,
  exportMasksToPng,
  getEditorConfig,
  initKeyboardCommands,
  loadH5Coordinates,
  loadMaskPolygons,
  useAnnotationDoubleClick,
  useAnnotations,
  useAnnotator,
  useContextMenu,
  useContextMenuBinding,
  useEditing,
  useHistory,
  useImageLayerVisibility,
  useLayerManager,
  usePushToolCursor,
  useSelection,
  useTool,
  useViewer,
  type Annotation,
  type AnnotationStyle,
} from "annota";
import {
  ChevronRight,
  CircleCheck,
  CircleDot,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FileCode,
  Hand,
  Image as ImageIcon,
  Layers,
  LineSquiggle,
  LoaderCircle,
  Lock,
  LockOpen,
  Maximize2,
  Merge,
  Pentagon,
  PenLine,
  Scissors,
  Sparkles,
  Square,
  SquareCheck,
  SquareDot,
  Star,
  Trash2,
  Undo,
  Redo,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { createApiPredictFn } from "../../services/sam-predict";
import { warmUpSamApi } from "../../services/sam-warmup";
import { cn } from "../../utils";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Toaster } from "../ui/Toaster";
import { Tooltip } from "../ui/Tooltip";

type ToolType =
  | "pan"
  | "point"
  | "rectangle"
  | "polygon"
  | "curve"
  | "sam"
  | "push"
  | "split";

interface DemoImage {
  id: string;
  path: string;
}

const DEMO_IMAGES: DemoImage[] = [
  { id: "0", path: "/playground/images/test/0.png" },
  { id: "1", path: "/playground/images/test/1.png" },
  { id: "2", path: "/playground/images/test/2.png" },
  { id: "3", path: "/playground/images/test/3.png" },
  { id: "4", path: "/playground/images/test/4.png" },
];

const MASK_SHAPE_TYPES = new Set(["polygon", "multipolygon", "path", "freehand"]);

function useViewportClampedPanel(active: boolean, dependencyKey = "") {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const panel = panelRef.current;
    if (!panel) return;

    const margin = 8;

    const clampToViewport = () => {
      const rect = panel.getBoundingClientRect();

      let x = 0;
      if (rect.left < margin) {
        x = margin - rect.left;
      } else if (rect.right > window.innerWidth - margin) {
        x = window.innerWidth - margin - rect.right;
      }

      let y = 0;
      if (rect.top < margin) {
        y = margin - rect.top;
      } else if (rect.bottom > window.innerHeight - margin) {
        y = window.innerHeight - margin - rect.bottom;
      }

      setOffset((previous) => (previous.x === x && previous.y === y ? previous : { x, y }));
    };

    const rafId = window.requestAnimationFrame(clampToViewport);
    window.addEventListener("resize", clampToViewport);

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(clampToViewport) : undefined;
    observer?.observe(panel);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", clampToViewport);
      observer?.disconnect();
    };
  }, [active, dependencyKey]);

  const style =
    offset.x !== 0 || offset.y !== 0
      ? ({ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` } as React.CSSProperties)
      : undefined;

  return { panelRef, style };
}

function ViewportClampedOverlay({
  className,
  active = true,
  dependencyKey = "",
  children,
}: {
  className: string;
  active?: boolean;
  dependencyKey?: string;
  children: React.ReactNode;
}) {
  const { panelRef, style } = useViewportClampedPanel(active, dependencyKey);

  return (
    <div ref={panelRef} style={style} className={className}>
      {children}
    </div>
  );
}

const categoryStyleFunction = (annotation: Annotation): AnnotationStyle => {
  const category = annotation.properties?.category as string | undefined;
  const classification = annotation.properties?.classification;

  if (classification === "negative") {
    return {
      fill: "#FF0000",
      fillOpacity: 0.4,
      stroke: "#FF6666",
      strokeOpacity: 1,
      strokeWidth: 2,
    };
  }

  if (classification === "positive") {
    return {
      fill: "#00FF00",
      fillOpacity: 0.3,
      stroke: "#66FF66",
      strokeOpacity: 1,
      strokeWidth: 2,
    };
  }

  if (category === "negative") {
    return {
      fill: "#FF0000",
      fillOpacity: 0.3,
      stroke: "#FF6666",
      strokeOpacity: 1,
      strokeWidth: 2,
    };
  }

  if (category === "positive") {
    return {
      fill: "#00FF00",
      fillOpacity: 0.25,
      stroke: "#FFFFFF",
      strokeOpacity: 1,
      strokeWidth: 2,
    };
  }

  return annotation.style || {};
};

function usePlaygroundLayers() {
  const annotator = useAnnotator();

  useEffect(() => {
    if (!annotator) return;

    if (!annotator.getLayer("positive-points")) {
      annotator.createLayer("positive-points", {
        name: "Positive Points",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        filter: (ann: Annotation) => ann.shape.type === "point" && ann.properties?.category === "positive",
      });
    }

    if (!annotator.getLayer("negative-points")) {
      annotator.createLayer("negative-points", {
        name: "Negative Points",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 2,
        filter: (ann: Annotation) => ann.shape.type === "point" && ann.properties?.category === "negative",
      });
    }

    if (!annotator.getLayer("positive-masks")) {
      annotator.createLayer("positive-masks", {
        name: "Positive Masks",
        visible: true,
        locked: false,
        opacity: 0.6,
        zIndex: 3,
        filter: (ann: Annotation) => {
          const isMaskShape = MASK_SHAPE_TYPES.has(ann.shape.type);
          if (!isMaskShape) return false;
          return ann.properties?.classification === "positive" || !ann.properties?.classification;
        },
      });
    }

    if (!annotator.getLayer("negative-masks")) {
      annotator.createLayer("negative-masks", {
        name: "Negative Masks",
        visible: true,
        locked: false,
        opacity: 0.6,
        zIndex: 4,
        filter: (ann: Annotation) => MASK_SHAPE_TYPES.has(ann.shape.type) && ann.properties?.classification === "negative",
      });
    }

    if (!annotator.getLayer("sam-preview")) {
      annotator.createLayer("sam-preview", {
        name: "SAM Preview",
        visible: true,
        locked: true,
        opacity: 0.4,
        zIndex: 5,
      });
    }
  }, [annotator]);
}

function PlaygroundSideEffects({
  viewer,
  currentImageId,
}: {
  viewer: OpenSeadragon.Viewer | undefined;
  currentImageId: string;
}) {
  const annotator = useAnnotator();
  const { startEditing, stopEditing } = useEditing();

  usePlaygroundLayers();
  useImageLayerVisibility(viewer);

  useEffect(() => {
    if (!annotator) return;

    const commands = initKeyboardCommands(annotator, {
      enableDelete: true,
      enableUndoRedo: true,
    });

    return () => commands.destroy();
  }, [annotator]);

  useAnnotationDoubleClick(viewer, (annotation) => {
    const editorConfig = getEditorConfig(annotation);
    if (editorConfig?.supportsVertexEditing) {
      startEditing(annotation.id);
      toast.success("Vertex editing mode enabled");
    }
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stopEditing();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [stopEditing]);

  const loadH5AnnotationsByCategory = useCallback(
    async (imageId: string, category: "positive" | "negative"): Promise<Annotation[]> => {
      const h5Path = `/playground/annotations/test/${category}/${imageId}.h5`;

      try {
        const annotations = await loadH5Coordinates(h5Path, {
          color: category === "positive" ? "#00FF00" : "#FF0000",
          fillOpacity: 0.8,
          strokeWidth: 1,
        });

        return annotations.map((ann) => ({
          ...ann,
          id: `${category}-${ann.id}`,
          properties: {
            ...ann.properties,
            category,
            source: "h5",
          },
        }));
      } catch (error) {
        console.warn(`No H5 file found or error loading: ${h5Path}`, error);
        return [];
      }
    },
    []
  );

  useEffect(() => {
    if (!annotator || !currentImageId) return;

    const timeoutId = window.setTimeout(async () => {
      const allAnnotations = annotator.state.store.all();
      const loadedAnnotations = allAnnotations.filter(
        (ann: Annotation) =>
          ann.properties?.source === "h5" ||
          ann.properties?.source === "png-mask" ||
          ann.properties?.source === "pgm"
      );
      loadedAnnotations.forEach((ann) => annotator.state.store.delete(ann.id));

      try {
        const [positiveAnnotations, negativeAnnotations, maskAnnotations] = await Promise.all([
          loadH5AnnotationsByCategory(currentImageId, "positive"),
          loadH5AnnotationsByCategory(currentImageId, "negative"),
          loadMaskPolygons(`/playground/masks/test/${currentImageId}.png`).catch((error) => {
            console.warn("[Playground] Failed to load mask", error);
            return [] as Annotation[];
          }),
        ]);

        const masksWithPolarity = maskAnnotations.map((ann) => {
          const { style, ...annotationWithoutStyle } = ann;
          return {
            ...annotationWithoutStyle,
            properties: {
              ...ann.properties,
              classification: "positive",
              source: "png-mask",
            },
          };
        });

        const totalH5 = positiveAnnotations.length + negativeAnnotations.length;
        const totalMasks = masksWithPolarity.length;

        if (totalH5 > 0 || totalMasks > 0) {
          annotator.addAnnotations([...positiveAnnotations, ...negativeAnnotations, ...masksWithPolarity]);

          const messages: string[] = [];
          if (totalH5 > 0) {
            messages.push(`${positiveAnnotations.length} positive, ${negativeAnnotations.length} negative`);
          }
          if (totalMasks > 0) {
            messages.push(`${totalMasks} mask(s)`);
          }
          toast.success(`Loaded ${messages.join(", ")}`);
        } else {
          toast.info("No annotations found for this image");
        }
      } catch (error) {
        console.error("Failed to load annotations", error);
        toast.error("Failed to load annotations");
      }
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [annotator, currentImageId, loadH5AnnotationsByCategory]);

  return null;
}

function ToolManager({
  viewer,
  tool,
  pushRadius,
  smoothingTolerance,
  activeLayerId,
  onSamInitializing,
}: {
  viewer: OpenSeadragon.Viewer | undefined;
  tool: ToolType;
  pushRadius: number;
  smoothingTolerance: number;
  activeLayerId: string;
  onSamInitializing: (initializing: boolean) => void;
}) {
  const pointTool = useMemo(
    () =>
      new PointTool({
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      }),
    [activeLayerId]
  );

  const rectangleTool = useMemo(
    () =>
      new RectangleTool({
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      }),
    [activeLayerId]
  );

  const polygonTool = useMemo(
    () =>
      new PolygonTool({
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      }),
    [activeLayerId]
  );

  const curveTool = useMemo(
    () =>
      new CurveTool({
        smoothingTolerance,
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      }),
    [activeLayerId, smoothingTolerance]
  );

  const pushTool = useMemo(() => new PushTool({ pushRadius }), [pushRadius]);

  const samTool = useMemo(
    () =>
      new SamTool({
        predictFn: createApiPredictFn(),
        imageWidth: 1024,
        imageHeight: 1024,
        showHoverPreview: true,
        previewOpacity: 0.4,
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      }),
    [activeLayerId]
  );

  const splitTool = useMemo(() => new SplitTool(), []);

  const initializedSamToolRef = useRef<SamTool | null>(null);

  useEffect(() => {
    if (tool !== "sam") return;
    if (initializedSamToolRef.current === samTool) return;

    onSamInitializing(true);
    samTool
      .initializeModel()
      .then(() => {
        initializedSamToolRef.current = samTool;
        onSamInitializing(false);
      })
      .catch(() => {
        onSamInitializing(false);
      });
  }, [onSamInitializing, samTool, tool]);

  useEffect(() => {
    if (!viewer) return;

    const handleImageOpen = () => {
      const item: any = viewer.world?.getItemAt?.(0);
      if (!item?.source?.url) return;

      const currentSrc = item.source.url as string;
      const dims = item.source?.dimensions;
      const width = dims?.x ?? 1024;
      const height = dims?.y ?? 1024;
      const stem = (currentSrc.split("/").pop() || "").replace(/\.[^.]+$/, "");
      const npyPath = `/playground/embeddings/test/${stem}.npy`;

      samTool.setEmbedding(npyPath, width, height);
    };

    viewer.addHandler("open", handleImageOpen);
    handleImageOpen();

    return () => {
      viewer.removeHandler("open", handleImageOpen);
    };
  }, [viewer, samTool]);

  useTool({ viewer, handler: pointTool, enabled: tool === "point" && !!viewer });
  useTool({ viewer, handler: rectangleTool, enabled: tool === "rectangle" && !!viewer });
  useTool({ viewer, handler: polygonTool, enabled: tool === "polygon" && !!viewer });
  useTool({ viewer, handler: curveTool, enabled: tool === "curve" && !!viewer });
  useTool({ viewer, handler: pushTool, enabled: tool === "push" && !!viewer });
  useTool({ viewer, handler: samTool, enabled: tool === "sam" && !!viewer });
  useTool({ viewer, handler: splitTool, enabled: tool === "split" && !!viewer });

  const { cursorPos, radiusInPixels } = usePushToolCursor(
    viewer,
    pushTool,
    tool === "push" && !!viewer
  );

  return cursorPos ? (
    <div
      style={{
        position: "fixed",
        left: `${cursorPos.x}px`,
        top: `${cursorPos.y}px`,
        width: `${radiusInPixels * 2}px`,
        height: `${radiusInPixels * 2}px`,
        borderRadius: "9999px",
        border: "2px solid #00ff00",
        backgroundColor: "rgba(0, 255, 0, 0.1)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 30,
      }}
    />
  ) : null;
}

function LayerPanel({
  activeLayerId,
  onActiveLayerChange,
}: {
  activeLayerId: string;
  onActiveLayerChange: (layerId: string) => void;
}) {
  const annotator = useAnnotator();
  const layerManager = useLayerManager();
  const [open, setOpen] = useState(false);

  const imageLayer = useMemo(
    () => layerManager.layers.find((layer) => layer.id === "image"),
    [layerManager.layers]
  );

  const sortedLayers = useMemo(
    () =>
      [...layerManager.layers]
        .filter((layer) => layer.id !== "image")
        .sort((a, b) => b.zIndex - a.zIndex),
    [layerManager.layers]
  );
  const layerPanelViewportKey = `${sortedLayers.length}:${imageLayer?.visible ? "1" : "0"}`;
  const { panelRef, style } = useViewportClampedPanel(open, layerPanelViewportKey);

  const handleExportLayer = useCallback(
    async (layerId: string, layerName: string) => {
      if (!annotator) return;

      try {
        const layer = annotator.getLayer(layerId);
        if (!layer?.filter) {
          toast.error("Layer not found");
          return;
        }

        const layerAnnotations = annotator.state.store
          .all()
          .filter((ann: Annotation) => layer.filter?.(ann));

        if (layerAnnotations.length === 0) {
          toast.info("No annotations in this layer to export");
          return;
        }

        const tiledImage: any = annotator.viewer?.world.getItemAt(0);
        if (!tiledImage) {
          toast.error("No image loaded");
          return;
        }

        const width = tiledImage.source.dimensions.x;
        const height = tiledImage.source.dimensions.y;

        toast.info("Exporting mask layer...");
        const pngData = await exportMasksToPng(layerAnnotations, width, height);

        const blob = new Blob([pngData], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${layerName.replace(/\s+/g, "_")}_mask.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${layerAnnotations.length} mask(s) to PNG`);
      } catch (error) {
        console.error("Failed to export layer", error);
        toast.error("Failed to export layer");
      }
    },
    [annotator]
  );

  return (
    <div className="relative">
      <Tooltip content="Layers" side="right">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setOpen((value) => !value)}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </Tooltip>

      {open && (
        <div
          ref={panelRef}
          style={style}
          className="absolute left-12 top-0 z-40 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold">Layers</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              aria-label="Close layers panel"
            >
              ×
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => layerManager.setLayerVisibility("image", !imageLayer?.visible)}
                  className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title={imageLayer?.visible ? "Hide image" : "Show image"}
                >
                  {imageLayer?.visible ? (
                    <Eye className="h-4 w-4 text-blue-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                <span className="flex-1 text-sm font-semibold">Image</span>
                <span className="text-xs text-slate-500">Background</span>
              </div>
            </div>

            {sortedLayers.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">No annotation layers</div>
            ) : (
              <div className="py-1">
                {sortedLayers.map((layer) => {
                  const isActive = activeLayerId === layer.id;

                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        "group relative px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        isActive && "bg-slate-100 dark:bg-slate-800"
                      )}
                    >
                      {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />}

                      <div className="mb-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onActiveLayerChange(layer.id)}
                          className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title={isActive ? "Active layer" : "Set as active layer"}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              isActive
                                ? "fill-blue-500 text-blue-500"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => layerManager.setLayerVisibility(layer.id, !layer.visible)}
                          className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title={layer.visible ? "Hide layer" : "Show layer"}
                        >
                          {layer.visible ? (
                            <Eye className="h-4 w-4 text-blue-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => layerManager.setLayerLocked(layer.id, !layer.locked)}
                          className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title={layer.locked ? "Unlock layer" : "Lock layer"}
                        >
                          {layer.locked ? (
                            <Lock className="h-4 w-4 text-orange-500" />
                          ) : (
                            <LockOpen className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        <span
                          className={cn(
                            "flex-1 truncate text-sm",
                            isActive && "font-semibold text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {layer.name}
                        </span>

                        {(layer.id === "positive-masks" || layer.id === "negative-masks") && (
                          <button
                            type="button"
                            onClick={() => void handleExportLayer(layer.id, layer.name)}
                            className="rounded p-1 transition-colors hover:bg-green-50 dark:hover:bg-green-950/20"
                            title="Export layer as PNG mask"
                          >
                            <Download className="h-4 w-4 text-green-600 dark:text-green-500" />
                          </button>
                        )}
                      </div>

                      <div className="ml-10 flex items-center gap-2">
                        <span className="w-16 text-xs text-slate-500">Opacity:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={layer.opacity}
                          onChange={(event) =>
                            layerManager.setLayerOpacity(layer.id, Number(event.currentTarget.value))
                          }
                          className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-300 dark:bg-slate-600"
                        />
                        <span className="w-8 text-right text-xs text-slate-500">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AnnotationToolbar({
  tool,
  onToolChange,
  viewer,
  samInitializing,
  activeLayerId,
  onActiveLayerChange,
}: {
  tool: ToolType;
  onToolChange: (nextTool: ToolType) => void;
  viewer: OpenSeadragon.Viewer | undefined;
  samInitializing: boolean;
  activeLayerId: string;
  onActiveLayerChange: (layerId: string) => void;
}) {
  const annotator = useAnnotator();
  const selectedAnnotations = useSelection();

  const handleAddImageAnnotation = useCallback(() => {
    if (!annotator || !viewer) return;

    const center = viewer.viewport.getCenter();
    const imageCenter = viewer.viewport.viewportToImageCoordinates(center);

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, "rgba(255, 100, 100, 0.7)");
    gradient.addColorStop(1, "rgba(100, 100, 255, 0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Analysis", 32, 28);
    ctx.fillText("Result", 32, 42);

    const imageData = canvas.toDataURL("image/png");

    annotator.state.store.add({
      id: `image-${Date.now()}`,
      shape: {
        type: "image",
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
      },
    });

    toast.success("Added sample image annotation at viewport center");
  }, [annotator, viewer]);

  const handleMerge = useCallback(() => {
    if (!annotator) return;

    const selectedIds = annotator.state.selection.getSelected();
    if (selectedIds.length < 2) {
      toast.info("Select 2 or more annotations to merge");
      return;
    }

    const annotations = selectedIds
      .map((id) => annotator.state.store.get(id))
      .filter((ann): ann is Annotation => ann !== undefined);

    if (!canMergeAnnotations(annotations)) {
      toast.error("Cannot merge selected annotations (incompatible types)");
      return;
    }

    const merged = annotator.mergeSelected();
    if (merged) {
      toast.success(`Merged ${selectedIds.length} annotations into one`);
    } else {
      toast.error("Failed to merge annotations");
    }
  }, [annotator]);

  const handleAutoAssignMasks = useCallback(() => {
    if (!annotator) return;

    const allAnnotations = annotator.state.store.all();
    const pointAnnotations = allAnnotations.filter((ann) => ann.shape.type === "point");
    const maskAnnotations = allAnnotations.filter((ann) => MASK_SHAPE_TYPES.has(ann.shape.type));

    if (maskAnnotations.length === 0) {
      toast.info("No mask annotations to assign");
      return;
    }

    if (pointAnnotations.length === 0) {
      toast.info("No point annotations found");
      return;
    }

    let assignedCount = 0;

    maskAnnotations.forEach((mask) => {
      let hasPositive = false;
      let hasNegative = false;

      pointAnnotations.forEach((point) => {
        if (point.shape.type !== "point") return;

        const isInside = containsPoint(mask.shape, point.shape.point.x, point.shape.point.y);
        if (!isInside) return;

        if (point.properties?.category === "positive") {
          hasPositive = true;
        } else if (point.properties?.category === "negative") {
          hasNegative = true;
        }
      });

      const currentClassification = mask.properties?.classification;
      let newClassification = currentClassification as "positive" | "negative" | undefined;

      if (hasPositive) {
        newClassification = "positive";
      } else if (hasNegative) {
        newClassification = "negative";
      }

      if (newClassification !== currentClassification) {
        annotator.updateAnnotation(mask.id, {
          ...mask,
          properties: {
            ...mask.properties,
            classification: newClassification,
          },
        });
        assignedCount += 1;
      }
    });

    if (assignedCount > 0) {
      toast.success(`Auto-assigned ${assignedCount} mask(s) to layers`);
    } else {
      toast.info("All masks already correctly assigned");
    }
  }, [annotator]);

  return (
    <Card className="border-slate-200/80 bg-white/95 p-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex flex-col items-center gap-1">
        <Tooltip content="Pan and zoom" side="right">
          <Button
            variant={tool === "pan" ? "default" : "ghost"}
            size="icon"
            onClick={() => onToolChange("pan")}
            className="h-9 w-9"
          >
            <Hand className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Add point markers" side="right">
          <Button
            variant={tool === "point" ? "default" : "ghost"}
            size="icon"
            onClick={() => onToolChange("point")}
            className={cn("h-9 w-9", tool === "point" && "bg-blue-600 hover:bg-blue-700")}
          >
            <CircleDot className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Draw rectangles" side="right">
          <Button
            variant={tool === "rectangle" ? "default" : "ghost"}
            size="icon"
            onClick={() => onToolChange("rectangle")}
            className={cn("h-9 w-9", tool === "rectangle" && "bg-blue-600 hover:bg-blue-700")}
          >
            <Square className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Draw polygons" side="right">
          <Button
            variant={tool === "polygon" ? "default" : "ghost"}
            size="icon"
            onClick={() => onToolChange("polygon")}
            className={cn("h-9 w-9", tool === "polygon" && "bg-blue-600 hover:bg-blue-700")}
          >
            <Pentagon className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Draw smooth curves" side="right">
          <Button
            variant={tool === "curve" ? "default" : "ghost"}
            size="icon"
            onClick={() => onToolChange("curve")}
            className={cn("h-9 w-9", tool === "curve" && "bg-blue-600 hover:bg-blue-700")}
          >
            <LineSquiggle className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content={samInitializing ? "SAM initializing..." : "SAM segmentation"} side="right">
          <Button
            variant={tool === "sam" ? "default" : "ghost"}
            size="icon"
            onClick={() => {
              warmUpSamApi();
              onToolChange("sam");
            }}
            className={cn("h-9 w-9", tool === "sam" && "bg-violet-600 hover:bg-violet-700")}
          >
            {samInitializing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
          </Button>
        </Tooltip>

        <Tooltip content="Split annotation" side="right">
          <Button
            variant={tool === "split" ? "default" : "ghost"}
            size="icon"
            onClick={() => onToolChange("split")}
            className={cn("h-9 w-9", tool === "split" && "bg-orange-600 hover:bg-orange-700")}
          >
            <Scissors className="h-4 w-4" />
          </Button>
        </Tooltip>

        <div className="my-1 h-px w-8 bg-slate-200 dark:bg-slate-800" />

        <Tooltip content="Add sample image annotation" side="right">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAddImageAnnotation}
            disabled={!annotator || !viewer}
            className="h-9 w-9 hover:bg-purple-50 disabled:opacity-50 dark:hover:bg-purple-950/20"
          >
            <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-500" />
          </Button>
        </Tooltip>

        <Tooltip content="Merge selected annotations" side="right">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMerge}
            disabled={!annotator || selectedAnnotations.length < 2}
            className="h-9 w-9 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-950/20"
          >
            <Merge className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          </Button>
        </Tooltip>

        <Tooltip content="Auto-assign masks from points" side="right">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAutoAssignMasks}
            className="h-9 w-9 hover:bg-violet-50 dark:hover:bg-violet-950/20"
          >
            <Sparkles className="h-4 w-4 text-violet-500" />
          </Button>
        </Tooltip>

        <div className="my-1 h-px w-8 bg-slate-200 dark:bg-slate-800" />

        <LayerPanel activeLayerId={activeLayerId} onActiveLayerChange={onActiveLayerChange} />
      </div>
    </Card>
  );
}

function ToolSettings({
  tool,
  pushRadius,
  onPushRadiusChange,
  smoothingTolerance,
  onSmoothingToleranceChange,
}: {
  tool: ToolType;
  pushRadius: number;
  onPushRadiusChange: (value: number) => void;
  smoothingTolerance: number;
  onSmoothingToleranceChange: (value: number) => void;
}) {
  if (tool === "curve") {
    return (
      <Card className="w-72 border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="space-y-2 p-3">
          <h3 className="text-sm font-semibold">Curve Tool</h3>
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Smoothness: {smoothingTolerance.toFixed(1)}
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={smoothingTolerance}
              onChange={(event) => onSmoothingToleranceChange(Number(event.currentTarget.value))}
              className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 dark:bg-slate-600"
            />
            <div className="mt-1 text-xs text-slate-500">Lower = more detail, Higher = smoother</div>
          </label>
        </div>
      </Card>
    );
  }

  if (tool === "sam") {
    return (
      <Card className="w-72 border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="space-y-2 p-3">
          <h3 className="text-sm font-semibold">SAM Segmentation</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Hover over objects to preview segmentation, click to create annotation.
          </p>
        </div>
      </Card>
    );
  }

  if (tool === "push") {
    return (
      <Card className="w-72 border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="space-y-2 p-3">
          <h3 className="text-sm font-semibold">Push Tool</h3>
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Radius: {pushRadius}
            <input
              type="range"
              min="10"
              max="100"
              value={pushRadius}
              onChange={(event) => onPushRadiusChange(Number(event.currentTarget.value))}
              className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 dark:bg-slate-600"
            />
          </label>
        </div>
      </Card>
    );
  }

  return null;
}

function GeneralToolbar({ viewer }: { viewer: OpenSeadragon.Viewer | undefined }) {
  const annotator = useAnnotator();
  const viewerControls = useViewer(viewer);
  const history = useHistory();

  const handleExportJson = useCallback(() => {
    if (!annotator) return;

    const annotations = annotator.state.store.all();
    if (annotations.length === 0) {
      toast.info("No annotations to export");
      return;
    }

    const json = exportJson(annotations);
    downloadJson(json, "annotations.geojson");
    toast.success(`Exported ${annotations.length} annotations to JSON`);
  }, [annotator]);

  const handleClearAll = useCallback(() => {
    if (!annotator) return;

    const annotations = annotator.state.store.all();
    if (annotations.length === 0) {
      toast.info("No annotations to clear");
      return;
    }

    if (window.confirm(`Clear all ${annotations.length} annotation(s)?`)) {
      annotator.clearAnnotations();
      toast.success("All annotations cleared");
    }
  }, [annotator]);

  return (
    <Card className="border-slate-200/80 bg-white/95 p-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex flex-row items-center gap-1">
        <Tooltip content="Zoom in" side="top">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => viewerControls.zoomIn()}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Zoom out" side="top">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => viewerControls.zoomOut()}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Fit to screen" side="top">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={viewerControls.zoomToFit}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </Tooltip>

        <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-slate-800" />

        <Tooltip
          content={history.canUndo ? `Undo (${history.undoSize})` : "Nothing to undo"}
          side="top"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={history.undo}
            disabled={!history.canUndo}
          >
            <Undo className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip
          content={history.canRedo ? `Redo (${history.redoSize})` : "Nothing to redo"}
          side="top"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={history.redo}
            disabled={!history.canRedo}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </Tooltip>

        <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-slate-800" />

        <Tooltip content="Export annotations as GeoJSON" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-green-50 dark:hover:bg-green-950/20"
            onClick={handleExportJson}
          >
            <FileCode className="h-4 w-4 text-green-600 dark:text-green-500" />
          </Button>
        </Tooltip>

        <Tooltip content="Clear all annotations" side="top">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={handleClearAll}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
    </Card>
  );
}

function DebugPanel({ currentImage, onNextImage }: { currentImage: string; onNextImage: () => void }) {
  const annotations = useAnnotations();
  const { panelRef, style } = useViewportClampedPanel(true, `${currentImage}:${annotations.length}`);

  return (
    <div ref={panelRef} style={style} className="absolute right-2 top-2 z-20">
      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <span className="px-1 text-xs">
          Annotations: <span className="font-mono">{annotations.length}</span>
        </span>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextImage}
          className="h-6 px-2 text-xs"
          title={`Next image (${currentImage})`}
        >
          <ChevronRight className="h-3 w-3" />
          {currentImage}
        </Button>
      </div>
    </div>
  );
}

function PlaygroundContextMenu() {
  const annotator = useAnnotator();
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } = useContextMenu();
  const { startEditing, isEditing } = useEditing();

  useContextMenuBinding(showViewerMenu, showAnnotationMenu);

  const annotation = menuState.annotation;
  const isMaskAnnotation = !!annotation && MASK_SHAPE_TYPES.has(annotation.shape.type);
  const isPointAnnotation = annotation?.shape.type === "point";
  const isCurrentlyPositiveMask =
    !!annotation &&
    (annotation.properties?.classification === "positive" ||
      (isMaskAnnotation && !annotation.properties?.classification));
  const isCurrentlyNegativeMask = !!annotation && annotation.properties?.classification === "negative";
  const isCurrentlyPositivePoint = !!annotation && annotation.properties?.category === "positive";
  const isCurrentlyNegativePoint = !!annotation && annotation.properties?.category === "negative";
  const supportsVertexEditing = annotation ? !!getEditorConfig(annotation)?.supportsVertexEditing : false;
  const isCurrentlyEditing = annotation ? isEditing(annotation.id) : false;

  const updateSelectedAnnotation = useCallback(
    (updates: Partial<Annotation>) => {
      if (!annotation || !annotator) return;
      annotator.updateAnnotation(annotation.id, {
        ...annotation,
        ...updates,
        properties: {
          ...annotation.properties,
          ...updates.properties,
        },
      });
      hideMenu();
    },
    [annotation, annotator, hideMenu]
  );

  const handleDelete = useCallback(() => {
    if (!annotation || !annotator) return;
    annotator.deleteAnnotation(annotation.id);
    toast.success("Annotation deleted");
    hideMenu();
  }, [annotation, annotator, hideMenu]);

  return (
    <ContextMenu position={menuState.position} onClose={hideMenu}>
      {menuState.type === "annotation" && annotation ? (
        <>
          {isMaskAnnotation ? (
            <>
              <div className="annota-context-menu-header">Mask Actions</div>
              <ContextMenuItem
                label={isCurrentlyPositiveMask ? "Positive Mask" : "Set as Positive Mask"}
                onClick={() => {
                  updateSelectedAnnotation({
                    properties: {
                      classification: "positive",
                      layer: "positive-masks",
                    },
                  });
                  toast.success("Set as positive mask (include)");
                }}
                disabled={isCurrentlyPositiveMask}
                icon={
                  isCurrentlyPositiveMask ? (
                    <SquareCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <SquareDot className="h-4 w-4 text-green-500" />
                  )
                }
              />
              <ContextMenuItem
                label={isCurrentlyNegativeMask ? "Negative Mask" : "Set as Negative Mask"}
                onClick={() => {
                  updateSelectedAnnotation({
                    properties: {
                      classification: "negative",
                      layer: "negative-masks",
                    },
                  });
                  toast.success("Set as negative mask (exclude)");
                }}
                disabled={isCurrentlyNegativeMask}
                icon={
                  isCurrentlyNegativeMask ? (
                    <SquareCheck className="h-4 w-4 text-red-500" />
                  ) : (
                    <SquareDot className="h-4 w-4 text-red-500" />
                  )
                }
              />
              <ContextMenuDivider />
              <ContextMenuItem
                label="Delete Annotation"
                onClick={handleDelete}
                danger
                icon={<Trash2 className="h-4 w-4" />}
              />
            </>
          ) : isPointAnnotation ? (
            <>
              <div className="annota-context-menu-header">Point Actions</div>
              <ContextMenuItem
                label={isCurrentlyPositivePoint ? "Positive Point" : "Set as Positive Point"}
                onClick={() => {
                  updateSelectedAnnotation({
                    properties: {
                      category: "positive",
                    },
                  });
                  toast.success("Set as positive point (include)");
                }}
                disabled={isCurrentlyPositivePoint}
                icon={
                  isCurrentlyPositivePoint ? (
                    <CircleCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <CircleDot className="h-4 w-4 text-green-500" />
                  )
                }
              />
              <ContextMenuItem
                label={isCurrentlyNegativePoint ? "Negative Point" : "Set as Negative Point"}
                onClick={() => {
                  updateSelectedAnnotation({
                    properties: {
                      category: "negative",
                    },
                  });
                  toast.success("Set as negative point (exclude)");
                }}
                disabled={isCurrentlyNegativePoint}
                icon={
                  isCurrentlyNegativePoint ? (
                    <CircleCheck className="h-4 w-4 text-red-500" />
                  ) : (
                    <CircleDot className="h-4 w-4 text-red-500" />
                  )
                }
              />
              <ContextMenuDivider />
              <ContextMenuItem
                label="Delete Annotation"
                onClick={handleDelete}
                danger
                icon={<Trash2 className="h-4 w-4" />}
              />
            </>
          ) : (
            <>
              <div className="annota-context-menu-header">Annotation Actions</div>
              {supportsVertexEditing && (
                <>
                  <ContextMenuItem
                    label={isCurrentlyEditing ? "Editing Vertices" : "Edit Vertices"}
                    onClick={() => {
                      if (!annotation) return;
                      startEditing(annotation.id);
                      toast.success("Vertex editing mode enabled");
                      hideMenu();
                    }}
                    disabled={isCurrentlyEditing}
                    icon={<PenLine className="h-4 w-4 text-blue-500" />}
                  />
                  <ContextMenuDivider />
                </>
              )}
              <ContextMenuItem
                label="Delete Annotation"
                onClick={handleDelete}
                danger
                icon={<Trash2 className="h-4 w-4" />}
              />
            </>
          )}
        </>
      ) : menuState.type === "viewer" ? (
        <>
          <div className="annota-context-menu-header">Viewer Actions</div>
          <ContextMenuItem
            label="Clear All Annotations"
            onClick={() => {
              if (!annotator) return;
              annotator.clearAnnotations();
              toast.success("All annotations cleared");
              hideMenu();
            }}
            danger
            icon={<Trash2 className="h-4 w-4" />}
          />
        </>
      ) : null}
    </ContextMenu>
  );
}

function PlaygroundCanvas({
  selectedImage,
  selectedTool,
  pushRadius,
  smoothingTolerance,
  activeLayerId,
  onSamInitializing,
  samInitializing,
  onToolChange,
  onPushRadiusChange,
  onSmoothingToleranceChange,
  onActiveLayerChange,
  onNextImage,
}: {
  selectedImage: DemoImage;
  selectedTool: ToolType;
  pushRadius: number;
  smoothingTolerance: number;
  activeLayerId: string;
  onSamInitializing: (initializing: boolean) => void;
  samInitializing: boolean;
  onToolChange: (tool: ToolType) => void;
  onPushRadiusChange: (value: number) => void;
  onSmoothingToleranceChange: (value: number) => void;
  onActiveLayerChange: (layerId: string) => void;
  onNextImage: () => void;
}) {
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer>();
  const hasToolSettings =
    selectedTool === "curve" || selectedTool === "sam" || selectedTool === "push";

  const viewerOptions = useMemo(
    () => ({
      tileSources: {
        type: "image" as const,
        url: selectedImage.path,
      },
      showNavigationControl: false,
      visibilityRatio: 1,
      minZoomLevel: 0.5,
      maxZoomLevel: 10,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: false,
      },
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4/build/openseadragon/images/",
    }),
    [selectedImage.path]
  );

  return (
    <div className="relative h-full w-full">
      <AnnotaViewer
        className="h-full w-full"
        options={viewerOptions}
        onViewerReady={(instance) => {
          setViewer(instance);
        }}
      />

      {viewer && (
        <>
          <Annotator viewer={viewer} style={categoryStyleFunction}>
            <ToolManager
              viewer={viewer}
              tool={selectedTool}
              pushRadius={pushRadius}
              smoothingTolerance={smoothingTolerance}
              activeLayerId={activeLayerId}
              onSamInitializing={onSamInitializing}
            />
            <PlaygroundSideEffects viewer={viewer} currentImageId={selectedImage.id} />
            <PlaygroundContextMenu />
          </Annotator>
          <AnnotationEditor viewer={viewer} />

          <ViewportClampedOverlay className="absolute bottom-4 right-4 z-20" dependencyKey="general-toolbar">
            <GeneralToolbar viewer={viewer} />
          </ViewportClampedOverlay>
        </>
      )}

      <div className="absolute bottom-4 left-4 top-4 z-20">
        <AnnotationToolbar
          tool={selectedTool}
          onToolChange={onToolChange}
          viewer={viewer}
          samInitializing={samInitializing}
          activeLayerId={activeLayerId}
          onActiveLayerChange={onActiveLayerChange}
        />
      </div>

      <ViewportClampedOverlay
        className="absolute left-20 top-4 z-20"
        active={hasToolSettings}
        dependencyKey={selectedTool}
      >
        <ToolSettings
          tool={selectedTool}
          pushRadius={pushRadius}
          onPushRadiusChange={onPushRadiusChange}
          smoothingTolerance={smoothingTolerance}
          onSmoothingToleranceChange={onSmoothingToleranceChange}
        />
      </ViewportClampedOverlay>

      <DebugPanel currentImage={`${selectedImage.id}.png`} onNextImage={onNextImage} />
    </div>
  );
}

export const Playground: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [tool, setTool] = useState<ToolType>("pan");
  const [pushRadius, setPushRadius] = useState(30);
  const [smoothingTolerance, setSmoothingTolerance] = useState(2);
  const [activeLayerId, setActiveLayerId] = useState("default");
  const [samInitializing, setSamInitializing] = useState(false);

  const selectedImage = DEMO_IMAGES[currentImageIndex];

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((index) => (index + 1) % DEMO_IMAGES.length);
  }, []);

  return (
    <AnnotaProvider>
      <div className="playground h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-slate-950">
        <Toaster />

        <PlaygroundCanvas
          selectedImage={selectedImage}
          selectedTool={tool}
          pushRadius={pushRadius}
          smoothingTolerance={smoothingTolerance}
          activeLayerId={activeLayerId}
          samInitializing={samInitializing}
          onSamInitializing={setSamInitializing}
          onToolChange={setTool}
          onPushRadiusChange={setPushRadius}
          onSmoothingToleranceChange={setSmoothingTolerance}
          onActiveLayerChange={setActiveLayerId}
          onNextImage={handleNextImage}
        />
      </div>
    </AnnotaProvider>
  );
};
