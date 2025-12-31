import { useEffect, useMemo, useRef } from "react";
import {
  useTool,
  usePushToolCursor,
  PointTool,
  RectangleTool,
  PolygonTool,
  CurveTool,
  PushTool,
  SamTool,
  SplitTool,
} from "annota";
import type { ToolType } from "./toolbar";
import { createApiPredictFn } from "./sam-predict-service";

interface ToolManagerProps {
  viewer: any;
  tool: ToolType;
  pushRadius: number;
  smoothingTolerance: number;
  activeLayerId?: string;
  onSamInitializing?: (initializing: boolean) => void;
}

export function ToolManager({
  viewer,
  tool,
  pushRadius,
  smoothingTolerance,
  activeLayerId,
  onSamInitializing,
}: ToolManagerProps) {
  // Create tool instances with active layer
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

  // Create API predict function (memoized)
  const apiPredictFn = useMemo(() => createApiPredictFn(), []);

  // SAM tool uses remote API for inference
  const samTool = useMemo(
    () =>
      new SamTool({
        predictFn: apiPredictFn,
        // Will be corrected to actual image size when image loads
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
    [activeLayerId, apiPredictFn]
  );
  const splitTool = useMemo(() => new SplitTool(), []);

  // Track initialized samTool instance to avoid re-initializing the same instance
  const initializedSamToolRef = useRef<SamTool | null>(null);

  // Initialize SAM tool when first used (lazy loading)
  // OpenCV is initialized internally by loadMaskPolygons when needed
  useEffect(() => {
    if (tool !== "sam") {
      return; // Don't initialize unless SAM tool is active
    }

    // Skip if this exact samTool instance is already initialized
    if (initializedSamToolRef.current === samTool) {
      return;
    }

    onSamInitializing?.(true); // Show spinner during initialization

    samTool.initializeModel()
      .then(() => {
        initializedSamToolRef.current = samTool; // Mark this instance as initialized
        onSamInitializing?.(false); // Hide spinner when done
      })
      .catch(() => {
        onSamInitializing?.(false); // Hide spinner on error
      });
  }, [tool, onSamInitializing, samTool]);

  // Update dynamic properties
  useEffect(() => {
    pushTool.setPushRadius(pushRadius);
  }, [pushTool, pushRadius]);

  // Enable tools based on selection (disabled when viewer is null)
  useTool({
    viewer,
    handler: pointTool,
    enabled: tool === "point" && !!viewer,
  });
  useTool({
    viewer,
    handler: rectangleTool,
    enabled: tool === "rectangle" && !!viewer,
  });
  useTool({
    viewer,
    handler: polygonTool,
    enabled: tool === "polygon" && !!viewer,
  });
  useTool({
    viewer,
    handler: curveTool,
    enabled: tool === "curve" && !!viewer,
  });
  useTool({ viewer, handler: pushTool, enabled: tool === "push" && !!viewer });
  useTool({
    viewer,
    handler: samTool,
    enabled: tool === "sam" && !!samTool && !!viewer,
  });

  // Update embedding path when image changes
  // Listen to OpenSeadragon's 'open' event to reload embeddings when images change
  useEffect(() => {
    if (!viewer || !samTool) return;

    const handleImageOpen = () => {
      const item: any = viewer.world?.getItemAt?.(0);
      if (!item?.source?.url) {
        return;
      }

      const currentSrc = item.source.url;
      const dims = item?.source?.dimensions;
      const width = dims?.x ?? 1024;
      const height = dims?.y ?? 1024;

      const stem = (currentSrc.split("/").pop() || "").replace(/\.[^.]+$/, "");
      const npyPath = `/playground/embeddings/test/${stem}.npy`;

      // Pass the embedding path to the API backend
      samTool.setEmbedding(npyPath, width, height);
    };

    // Listen to OSD's 'open' event which fires when a new image is loaded
    viewer.addHandler("open", handleImageOpen);

    // Also run once on mount to load the initial image's embedding
    handleImageOpen();

    return () => {
      viewer.removeHandler("open", handleImageOpen);
    };
  }, [viewer, samTool]);

  useTool({
    viewer,
    handler: splitTool,
    enabled: tool === "split" && !!viewer,
  });

  // Render push cursor (disabled when viewer is null)
  const { cursorPos, radiusInPixels } = usePushToolCursor(
    viewer,
    pushTool,
    tool === "push" && !!viewer
  );

  return (
    <>
      {cursorPos && (
        <div
          style={{
            position: "fixed",
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${radiusInPixels * 2}px`,
            height: `${radiusInPixels * 2}px`,
            borderRadius: "50%",
            border: "2px solid #00ff00",
            backgroundColor: "rgba(0, 255, 0, 0.1)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
    </>
  );
}
