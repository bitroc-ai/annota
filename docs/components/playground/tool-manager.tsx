import { useEffect, useMemo } from "react";
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
  createDummyEmbedding,
} from "annota";
import type { ToolType } from "./toolbar";

interface ToolManagerProps {
  viewer: any;
  tool: ToolType;
  threshold: number;
  pushRadius: number;
  smoothingTolerance: number;
  activeLayerId?: string;
  onSamInitialized?: (initialized: boolean) => void;
}

export function ToolManager({
  viewer,
  tool,
  pushRadius,
  smoothingTolerance,
  activeLayerId,
  onSamInitialized,
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
  const samTool = useMemo(
    () =>
      new SamTool({
        decoderModelUrl: "/models/sam_onnx_quantized_example.onnx",
        embedding: createDummyEmbedding(),
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

  // Initialize SAM model on mount
  useEffect(() => {
    console.log("Initializing SAM model...");
    onSamInitialized?.(false);

    samTool
      .initializeModel()
      .then(() => {
        console.log("SAM model initialized successfully");
        onSamInitialized?.(true);
      })
      .catch((err) => {
        console.error("Failed to initialize SAM model:", err);
        onSamInitialized?.(false);
      });
  }, [samTool, onSamInitialized]);

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
