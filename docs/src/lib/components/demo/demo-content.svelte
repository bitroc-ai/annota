<script lang="ts">
  import { getAnnotator, tool, Viewer as AnnotaViewer } from "annota/svelte";
  import {
    PointTool,
    RectangleTool,
    CurveTool,
    SamTool,
    type SamTool as SamToolType,
  } from "annota";
  import {
    Hand,
    CircleDot,
    Square,
    MousePointerClick,
    Activity, // LineSquiggle replacement
  } from "lucide-svelte";

  import Tooltip from "../ui/tooltip.svelte";
  import DemoContextMenu from "./demo-context-menu.svelte";
  import { createInitialAnnotations } from "./utils";
  import { createMockPredictFn } from "$lib/services/sam-predict";

  interface Props {
    imageUrl?: string;
    embeddingUrl?: string;
  }

  let {
    imageUrl = "/playground/images/test/0.png",
    embeddingUrl = "/playground/embeddings/test/0.npy",
  }: Props = $props();

  const getAnnotatorFn = getAnnotator();
  let viewer = $state<any>(undefined);
  let activeToolId = $state<
    "pan" | "point" | "rectangle" | "curve" | "segment"
  >("pan");
  let isSegmentToolReady = $state(false);

  // Tools
  const pointTool = new PointTool();
  const rectangleTool = new RectangleTool();
  const curveTool = new CurveTool();

  let segmentTool = $state<InstanceType<typeof SamTool> | null>(null);

  // Init Segment Tool
  $effect(() => {
    if (!viewer) return;

    // Use Mock for demo by default to avoid backend dependency issues initially
    // Or switch to Api if backend is ready.
    // Using Mock for now.
    const predictFn = createMockPredictFn();

    const tool = new SamTool({
      predictFn,
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

    tool
      .initializeModel()
      .then(() => {
        segmentTool = tool;
        isSegmentToolReady = true;

        if (embeddingUrl) {
          // Basic embedding setup if needed (mock ignores it)
          // const dims = viewer.world?.getItemAt?.(0)?.source?.dimensions;
          // tool.setEmbedding(embeddingUrl, dims?.x ?? 1024, dims?.y ?? 1024);
        }
      })
      .catch(console.error);
  });

  // Activate Tools using function
  tool({
    viewer: () => viewer,
    handler: () => pointTool,
    enabled: () => activeToolId === "point",
  });
  tool({
    viewer: () => viewer,
    handler: () => rectangleTool,
    enabled: () => activeToolId === "rectangle",
  });
  tool({
    viewer: () => viewer,
    handler: () => curveTool,
    enabled: () => activeToolId === "curve",
  });
  tool({
    viewer: () => viewer,
    handler: () => segmentTool,
    enabled: () => activeToolId === "segment" && !!segmentTool,
  });

  // Initial Annotations
  let annotationsAdded = false;
  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator || !viewer || annotationsAdded) return;

    annotationsAdded = true;
    setTimeout(() => {
      const item: any = viewer.world?.getItemAt?.(0);
      const dims = item?.source?.dimensions;
      const width = dims?.x ?? 1024;
      const height = dims?.y ?? 1024;
      const examples = createInitialAnnotations(width, height);

      examples.forEach((ann) => {
        try {
          annotator.state.store.add(ann);
        } catch {}
      });
    }, 500);
  });

  const tools = [
    { id: "pan", label: "Pan and zoom", icon: Hand },
    { id: "point", label: "Add point markers", icon: CircleDot },
    { id: "rectangle", label: "Draw rectangles", icon: Square },
    { id: "curve", label: "Draw smooth curves", icon: Activity },
    { id: "segment", label: "SAM Segmentation", icon: MousePointerClick },
  ] as const;
</script>

<div class="relative w-full h-full">
  <!-- Toolbar -->
  <div
    class="absolute top-4 left-4 z-40 flex gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1"
  >
    {#each tools as tool}
      {@const Icon = tool.icon}
      {@const isDisabled = tool.id === "segment" && !isSegmentToolReady}
      <Tooltip
        text={isDisabled ? "Loading model..." : tool.label}
        side="bottom"
      >
        <button
          onclick={() => (activeToolId = tool.id)}
          disabled={isDisabled}
          class="w-9 h-9 flex items-center justify-center rounded-md transition-all {activeToolId ===
          tool.id
            ? 'bg-blue-600 text-white shadow-sm'
            : isDisabled
              ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}"
        >
          <Icon
            class="w-4 h-4 {tool.id === 'segment' &&
            !isDisabled &&
            activeToolId !== tool.id
              ? 'text-purple-600 dark:text-purple-400'
              : ''}"
          />
        </button>
      </Tooltip>
    {/each}
  </div>

  <!-- Viewer -->
  <AnnotaViewer
    class="w-full h-full"
    options={{
      tileSources: { type: "image", url: imageUrl },
      showNavigationControl: false,
      showNavigator: false,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      maxZoomPixelRatio: 2,
      minZoomImageRatio: 1,
      visibilityRatio: 1,
      constrainDuringPan: true,
    }}
    onViewerReady={(v) => (viewer = v)}
  />

  <!-- Context Menu Component -->
  <DemoContextMenu />

  <!-- Hint -->
  {#if activeToolId === "segment" && viewer}
    <div
      class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/90 text-white text-sm rounded-lg shadow-lg backdrop-blur-sm border border-slate-700"
    >
      <div class="flex items-center gap-2">
        <MousePointerClick class="w-6 h-6" />
        <span>
          Hover to preview • Click to annotate • Right-click for menu
        </span>
      </div>
    </div>
  {/if}
</div>
