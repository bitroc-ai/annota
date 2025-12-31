<script lang="ts">
  import {
    AnnotaProvider,
    Annotator,
    AnnotaViewer,
    useTool,
    useAnnotator,
  } from "annota/svelte";
  import { RectangleTool, PolygonTool, PointTool } from "annota";

  let { type }: { type: string } = $props();

  let viewer = $state<any>(undefined);

  // Configs
  const configs: any = {
    rectangle: {
      Tool: RectangleTool,
      initial: [
        {
          id: "rect-1",
          shape: {
            type: "rectangle",
            x: 150,
            y: 200,
            width: 350,
            height: 250,
            bounds: { minX: 150, minY: 200, maxX: 500, maxY: 450 },
          },
          style: {
            fill: "#3b82f6",
            fillOpacity: 0.3,
            stroke: "#3b82f6",
            strokeWidth: 3,
          },
        },
      ],
    },
    polygon: {
      Tool: PolygonTool,
      initial: [
        {
          id: "poly-1",
          shape: {
            type: "polygon",
            points: [
              { x: 400, y: 300 },
              { x: 600, y: 300 },
              { x: 500, y: 500 },
            ],
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
          },
          properties: { label: "Polygon" },
          style: {
            fill: "#10b981",
            fillOpacity: 0.3,
            stroke: "#10b981",
            strokeWidth: 3,
          },
        },
      ],
    },
    points: {
      Tool: PointTool,
      initial: [
        {
          id: "pt-1",
          shape: {
            type: "point",
            point: { x: 512, y: 512 },
            bounds: { minX: 512, minY: 512, maxX: 512, maxY: 512 },
          },
          style: {
            fill: "#ef4444",
            fillOpacity: 1,
            stroke: "#fff",
            strokeWidth: 2,
          },
        },
      ],
    },
  };

  let config = $derived(configs[type]);

  // Logic Component
  import ExampleLogic from "./ExampleLogic.svelte";
</script>

{#if config}
  <div class="h-full w-full">
    <AnnotaProvider>
      <AnnotaViewer
        class="h-full w-full"
        options={{
          tileSources: { type: "image", url: "/playground/images/test/0.png" }, // Use absolute path or fix asset
          showNavigationControl: false,
        }}
        onViewerReady={(v) => (viewer = v)}
      />
      <Annotator {viewer}>
        <ExampleLogic {config} {viewer} />
      </Annotator>
    </AnnotaProvider>
  </div>
{:else}
  <div>Unknown example type: {type}</div>
{/if}
