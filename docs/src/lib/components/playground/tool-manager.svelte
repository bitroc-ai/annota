<script lang="ts">
  import { onMount } from "svelte";
  import {
    tool as toolUtil,
    pushToolCursor,
  } from "annota/svelte";
  import {
    PointTool,
    RectangleTool,
    PolygonTool,
    CurveTool,
    PushTool,
    SamTool,
    SplitTool,
  } from "annota";
  import type { ToolType } from "./toolbar";
  import { createApiPredictFn } from "$lib/services/sam-predict";

  interface Props {
    viewer?: any;
    tool: ToolType;
    pushRadius: number;
    smoothingTolerance: number;
    activeLayerId?: string;
    onSamInitializing?: (initializing: boolean) => void;
  }

  let {
    viewer,
    tool,
    pushRadius,
    smoothingTolerance,
    activeLayerId,
    onSamInitializing,
  }: Props = $props();

  const pointTool = $derived.by(
    () =>
      new PointTool({
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      })
  );

  const rectangleTool = $derived.by(
    () =>
      new RectangleTool({
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      })
  );

  const polygonTool = $derived.by(
    () =>
      new PolygonTool({
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      })
  );

  const curveTool = $derived.by(
    () =>
      new CurveTool({
        smoothingTolerance,
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      })
  );

  const pushTool = $derived.by(() => new PushTool({ pushRadius }));

  const apiPredictFn = $derived.by(() => createApiPredictFn());

  const samTool = $derived.by(
    () =>
      new SamTool({
        predictFn: apiPredictFn,
        imageWidth: 1024,
        imageHeight: 1024,
        showHoverPreview: true,
        previewOpacity: 0.4,
        annotationProperties: {
          layer: activeLayerId,
          category: "positive",
          tags: [],
        },
      })
  );

  const splitTool = $derived.by(() => new SplitTool());

  let initializedSamToolRef: SamTool | null = $state(null);

  // Initialize SAM tool when first used
  $effect(() => {
    if (tool !== "sam") return;
    if (initializedSamToolRef === samTool) return;

    onSamInitializing?.(true);

    samTool
      .initializeModel()
      .then(() => {
        initializedSamToolRef = samTool;
        onSamInitializing?.(false);
      })
      .catch(() => {
        onSamInitializing?.(false);
      });
  });

  // Update push radius
  $effect(() => {
    pushTool.setPushRadius(pushRadius);
  });

  // Enable tools
  toolUtil({
    viewer: () => viewer,
    handler: () => pointTool,
    enabled: () => tool === "point" && !!viewer,
  });

  toolUtil({
    viewer: () => viewer,
    handler: () => rectangleTool,
    enabled: () => tool === "rectangle" && !!viewer,
  });

  toolUtil({
    viewer: () => viewer,
    handler: () => polygonTool,
    enabled: () => tool === "polygon" && !!viewer,
  });

  toolUtil({
    viewer: () => viewer,
    handler: () => curveTool,
    enabled: () => tool === "curve" && !!viewer,
  });

  toolUtil({
    viewer: () => viewer,
    handler: () => pushTool,
    enabled: () => tool === "push" && !!viewer,
  });

  toolUtil({
    viewer: () => viewer,
    handler: () => samTool,
    enabled: () => tool === "sam" && !!samTool && !!viewer,
  });

  toolUtil({
    viewer: () => viewer,
    handler: () => splitTool,
    enabled: () => tool === "split" && !!viewer,
  });

  // Update embedding path when image changes
  onMount(() => {
    if (!viewer || !samTool) return;

    const handleImageOpen = () => {
      const item: any = viewer.world?.getItemAt?.(0);
      if (!item?.source?.url) return;

      const currentSrc = item.source.url;
      const dims = item?.source?.dimensions;
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
  });

  // Push tool cursor - pass functions to track reactive values
  const pushCursor = pushToolCursor(
    () => viewer,
    () => pushTool,
    () => tool === "push" && !!viewer && !!pushTool
  );
  const cursorPos = $derived(pushCursor.cursorPos());
  const radiusInPixels = $derived(pushCursor.radiusInPixels());
</script>

{#if cursorPos}
  <div
    style="position: fixed; left: {cursorPos.x}px; top: {cursorPos.y}px; width: {radiusInPixels *
      2}px; height: {radiusInPixels *
      2}px; border-radius: 50%; border: 2px solid #00ff00; background-color: rgba(0, 255, 0, 0.1); transform: translate(-50%, -50%); pointer-events: none; z-index: 10;"
  ></div>
{/if}
