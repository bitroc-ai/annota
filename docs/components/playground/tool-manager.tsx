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
  loadNpyEmbedding,
} from "annota";
import type { ToolType } from "./toolbar";

interface ToolManagerProps {
  viewer: any;
  tool: ToolType;
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
        decoderModelUrl: "/models/sam_onnx_quantized_vit_b.onnx",
        // Start with a dummy embedding; we'll replace it if a matching .npy
        // embedding is available for the current image.
        embedding: createDummyEmbedding(),
        // Will be corrected to actual image size below.
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

  // Replace dummy embedding with a real .npy embedding if available
  // and update the tool with the actual image dimensions.
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

      // Always set correct dimensions (even if we keep the dummy for now)
      try {
        // @ts-ignore internal access to reuse existing tensor
        samTool.setEmbedding((samTool as any).samOptions.embedding, width, height);
      } catch {}

      const stem = (currentSrc.split("/").pop() || "").replace(/\.[^.]+$/, "");
      const npyUrlBase = `/playground/embeddings/test/${stem}.npy`;
      const npyUrl = `${npyUrlBase}?v=${Date.now()}`; // cache-bust to avoid stale loads

      const token = Symbol("embedding-load");
      (window as any).__annotaEmbeddingToken = token;

      (async () => {
        try {
          const embedding = await loadNpyEmbedding(npyUrl);
          if ((window as any).__annotaEmbeddingToken !== token) {
            return; // effect re-ran; drop stale
          }
          samTool.setEmbedding(embedding, width, height);

          // Optional runtime verification: compare image dims and SHA256 if sidecar exists
          const sidecar = npyUrlBase.replace(/\.npy$/, ".json");
          try {
            const r = await fetch(sidecar);
            if (r.ok) {
              const meta = await r.json();
              if (meta && (meta.width !== width || meta.height !== height)) {
                console.warn("[ToolManager] Embedding/image dimension mismatch:", meta, { width, height });
              }
              const imgResp = await fetch(item?.source?.url);
              if (imgResp.ok) {
                const buf = await imgResp.arrayBuffer();
                const digest = await crypto.subtle.digest("SHA-256", buf);
                const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join("");
                if (meta?.sha256 && hex !== meta.sha256) {
                  console.warn("[ToolManager] Embedding/image SHA mismatch:", hex.slice(0,12), "!=", String(meta.sha256).slice(0,12));
                }
              }
            }
          } catch {}
        } catch (e) {
          // No embedding found - continue using dummy
        }
      })();
    };

    // Listen to OSD's 'open' event which fires when a new image is loaded
    viewer.addHandler('open', handleImageOpen);

    // Also run once on mount to load the initial image's embedding
    handleImageOpen();

    return () => {
      viewer.removeHandler('open', handleImageOpen);
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
