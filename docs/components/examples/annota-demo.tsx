"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Hand,
  CircleDot,
  Square,
  SquareCheck,
  CircleCheck,
  Trash2,
  MousePointerClick,
  LineSquiggle,
} from "lucide-react";
import {
  AnnotaProvider,
  Annotator,
  AnnotaViewer,
  useAnnotator,
  AnnotationEditor,
  useContextMenu,
  useContextMenuBinding,
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
  SamTool,
  PointTool,
  RectangleTool,
  CurveTool,
  useTool,
  loadNpyEmbedding,
  createDummyEmbedding,
  type Annotation,
} from "annota";

interface AnnotaDemoProps {
  /** Size of the square viewer in pixels (default: 640) */
  size?: number;
  /** Image URL to display (default: test image) */
  imageUrl?: string;
  /** Embedding URL for intelligent segmentation (optional) */
  embeddingUrl?: string;
}

type ToolType = "pan" | "point" | "rectangle" | "curve" | "segment";

// Helper function to create initial demo annotations
function createInitialAnnotations(width: number, height: number): Annotation[] {
  return [
    // Rectangle annotations
    {
      id: "demo-rect-1",
      shape: {
        type: "rectangle",
        x: width * 0.15,
        y: height * 0.2,
        width: width * 0.12,
        height: height * 0.15,
        bounds: {
          minX: width * 0.15,
          minY: width * 0.2,
          maxX: width * 0.27,
          maxY: height * 0.35,
        },
      },
      properties: {
        source: "demo-example",
        label: "Region 1",
      },
      style: {
        stroke: "#10b981",
        strokeWidth: 2,
        fill: "#10b981",
        fillOpacity: 0.15,
      },
    },
    {
      id: "demo-rect-2",
      shape: {
        type: "rectangle",
        x: width * 0.65,
        y: height * 0.15,
        width: width * 0.18,
        height: width * 0.12,
        bounds: {
          minX: width * 0.65,
          minY: height * 0.15,
          maxX: width * 0.83,
          maxY: height * 0.27,
        },
      },
      properties: {
        source: "demo-example",
        label: "Region 2",
      },
      style: {
        stroke: "#3b82f6",
        strokeWidth: 2,
        fill: "#3b82f6",
        fillOpacity: 0.15,
      },
    },
    // Polygon annotation
    {
      id: "demo-polygon-1",
      shape: {
        type: "polygon",
        points: [
          { x: width * 0.4, y: height * 0.55 },
          { x: width * 0.5, y: height * 0.5 },
          { x: width * 0.58, y: height * 0.6 },
          { x: width * 0.52, y: height * 0.7 },
          { x: width * 0.42, y: height * 0.68 },
        ],
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      },
      properties: {
        source: "demo-example",
        label: "Custom Shape",
      },
      style: {
        stroke: "#f59e0b",
        strokeWidth: 2,
        fill: "#f59e0b",
        fillOpacity: 0.15,
      },
    },
    // Point annotations
    {
      id: "demo-point-1",
      shape: {
        type: "point",
        point: { x: width * 0.25, y: height * 0.65 },
        bounds: {
          minX: width * 0.25,
          minY: height * 0.65,
          maxX: width * 0.25,
          maxY: height * 0.65,
        },
      },
      properties: {
        source: "demo-example",
        label: "Cell 1",
      },
      style: {
        fill: "#ef4444",
        fillOpacity: 0.9,
        stroke: "#fff",
        strokeWidth: 2,
      },
    },
    {
      id: "demo-point-2",
      shape: {
        type: "point",
        point: { x: width * 0.32, y: height * 0.72 },
        bounds: {
          minX: width * 0.32,
          minY: height * 0.72,
          maxX: width * 0.32,
          maxY: height * 0.72,
        },
      },
      properties: {
        source: "demo-example",
        label: "Cell 2",
      },
      style: {
        fill: "#ef4444",
        fillOpacity: 0.9,
        stroke: "#fff",
        strokeWidth: 2,
      },
    },
    {
      id: "demo-point-3",
      shape: {
        type: "point",
        point: { x: width * 0.78, y: height * 0.82 },
        bounds: {
          minX: width * 0.78,
          minY: height * 0.82,
          maxX: width * 0.78,
          maxY: height * 0.82,
        },
      },
      properties: {
        source: "demo-example",
        label: "Cell 3",
      },
      style: {
        fill: "#ef4444",
        fillOpacity: 0.9,
        stroke: "#fff",
        strokeWidth: 2,
      },
    },
  ];
}

function AnnotaDemoViewer({
  viewer,
  embeddingUrl,
  activeTool,
}: {
  viewer: any;
  embeddingUrl?: string;
  activeTool: ToolType;
}) {
  const annotator = useAnnotator();
  const [segmentTool, setSegmentTool] = useState<SamTool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const modelReadyRef = useRef(false);

  // Initialize intelligent segmentation tool
  useEffect(() => {
    if (!viewer) return;

    const initSegmentTool = async () => {
      try {
        const dummyEmbedding = createDummyEmbedding();

        const tool = new SamTool({
          decoderModelUrl: "/models/sam_onnx_quantized_vit_b.onnx",
          embedding: dummyEmbedding,
          imageWidth: 1024,
          imageHeight: 1024,
          showHoverPreview: true,
          previewOpacity: 0.5,
          annotationProperties: {
            properties: {
              source: "annota-demo",
              layer: "demo",
            },
          },
        });

        await tool.initializeModel();
        setSegmentTool(tool);

        if (!modelReadyRef.current) {
          modelReadyRef.current = true;
          setIsLoading(false);
        }

        // Load real embedding if available
        if (embeddingUrl) {
          try {
            const embedding = await loadNpyEmbedding(embeddingUrl);
            const item: any = viewer.world?.getItemAt?.(0);
            const dims = item?.source?.dimensions;
            const width = dims?.x ?? 1024;
            const height = dims?.y ?? 1024;
            tool.setEmbedding(embedding, width, height);
          } catch (e) {
            console.log("Using dummy embedding");
          }
        }
      } catch (error) {
        console.error("Failed to initialize segmentation tool:", error);
        setIsLoading(false);
      }
    };

    initSegmentTool();
  }, [viewer, embeddingUrl]);

  // Initialize basic annotation tools (memoized to prevent recreation on every render)
  const pointTool = useMemo(() => new PointTool(), []);
  const rectangleTool = useMemo(() => new RectangleTool(), []);
  const curveTool = useMemo(() => new CurveTool(), []);

  // Activate the appropriate tool based on selection
  useTool({
    viewer,
    handler: activeTool === "point" ? pointTool : null,
    enabled: activeTool === "point" && !!viewer,
  });

  useTool({
    viewer,
    handler: activeTool === "rectangle" ? rectangleTool : null,
    enabled: activeTool === "rectangle" && !!viewer,
  });

  useTool({
    viewer,
    handler: activeTool === "curve" ? curveTool : null,
    enabled: activeTool === "curve" && !!viewer,
  });

  useTool({
    viewer,
    handler: activeTool === "segment" ? segmentTool : null,
    enabled: activeTool === "segment" && !!segmentTool && !!viewer,
  });

  // Add example annotations
  useEffect(() => {
    if (!annotator || !viewer) return;

    const addExampleAnnotations = () => {
      setTimeout(() => {
        const item: any = viewer.world?.getItemAt?.(0);
        const dims = item?.source?.dimensions;
        const width = dims?.x ?? 1024;
        const height = dims?.y ?? 1024;

        const examples = createInitialAnnotations(width, height);

        examples.forEach((annotation) => {
          try {
            annotator.state.store.add(annotation);
          } catch (e) {
            // Ignore duplicates
          }
        });
      }, 500);
    };

    addExampleAnnotations();
  }, [annotator, viewer]);

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-2"></div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Loading intelligent segmentation...
            </p>
          </div>
        </div>
      )}
      <AnnotationEditor viewer={viewer} />
      <DemoContextMenu />
    </>
  );
}

function DemoContextMenu() {
  const annotator = useAnnotator();
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } =
    useContextMenu();

  // Automatically bind context menu to viewer canvas
  useContextMenuBinding(showViewerMenu, showAnnotationMenu);

  const handleSetPositive = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        classification: "positive",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    hideMenu();
  }, [menuState.annotation, annotator, hideMenu]);

  const handleSetNegative = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        classification: "negative",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    hideMenu();
  }, [menuState.annotation, annotator, hideMenu]);

  const handleDelete = useCallback(() => {
    if (!menuState.annotation || !annotator) return;

    annotator.deleteAnnotation(menuState.annotation.id);
    hideMenu();
  }, [menuState.annotation, annotator, hideMenu]);

  const isPositive =
    menuState.annotation?.properties?.classification === "positive";
  const isNegative =
    menuState.annotation?.properties?.classification === "negative";

  return (
    <ContextMenu position={menuState.position} onClose={hideMenu}>
      {menuState.type === "annotation" && menuState.annotation && (
        <>
          <ContextMenuItem
            icon={<SquareCheck className="w-4 h-4" />}
            label="Mark as Positive"
            onClick={handleSetPositive}
            disabled={isPositive}
          />
          <ContextMenuItem
            icon={<CircleCheck className="w-4 h-4" />}
            label="Mark as Negative"
            onClick={handleSetNegative}
            disabled={isNegative}
          />
          <ContextMenuDivider />
          <ContextMenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            onClick={handleDelete}
            danger
          />
        </>
      )}
    </ContextMenu>
  );
}

/**
 * Interactive Annota demo showcasing annotation features.
 * Includes pan, point, rectangle, and intelligent segmentation tools.
 */
export function AnnotaDemo({
  size = 640,
  imageUrl = "/playground/images/test/0.png",
  embeddingUrl = "/playground/embeddings/test/0.npy",
}: AnnotaDemoProps) {
  const [viewer, setViewer] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("pan");

  const tools = [
    { id: "pan" as ToolType, label: "Pan and zoom", icon: Hand },
    { id: "point" as ToolType, label: "Add point markers", icon: CircleDot },
    { id: "rectangle" as ToolType, label: "Draw rectangles", icon: Square },
    {
      id: "curve" as ToolType,
      label: "Draw smooth curves (freehand)",
      icon: LineSquiggle,
    },
    {
      id: "segment" as ToolType,
      label: "SAM Segmentation (click on objects)",
      icon: MousePointerClick,
    },
  ];

  return (
    <div
      className="relative"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <AnnotaProvider>
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-40 flex gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-9 h-9 flex items-center justify-center rounded-md transition-all ${
                  activeTool === tool.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
                title={tool.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Viewer */}
        <AnnotaViewer
          className="w-full h-full"
          options={{
            tileSources: {
              type: "image",
              url: imageUrl,
            },
            showNavigationControl: false,
            showNavigator: false,
            gestureSettingsMouse: {
              clickToZoom: false,
              dblClickToZoom: true,
            },
            maxZoomPixelRatio: 2,
            minZoomImageRatio: 1,
            visibilityRatio: 1,
            constrainDuringPan: true,
          }}
          onViewerReady={setViewer}
        />
        <Annotator viewer={viewer}>
          <AnnotaDemoViewer
            viewer={viewer}
            embeddingUrl={embeddingUrl}
            activeTool={activeTool}
          />
        </Annotator>

        {/* Hint for segment tool */}
        {activeTool === "segment" && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/90 text-white text-sm rounded-lg shadow-lg backdrop-blur-sm border border-slate-700">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-6 h-6" />
              <span>
                Hover to preview • Click to annotate • Right-click for menu
              </span>
            </div>
          </div>
        )}
      </AnnotaProvider>
    </div>
  );
}
