<script module>
  import ExampleWrapper from "./ExampleWrapper.svelte";
</script>

<script lang="ts">
  import { page } from "$app/stores";
  import {
    AnnotaProvider,
    Annotator,
    AnnotaViewer,
    useTool,
    useAnnotator,
  } from "annota/svelte";
  import {
    RectangleTool,
    PolygonTool,
    PointTool,
    type Annotation,
  } from "annota";

  // Dynamic route parameter
  let type = $derived($page.params.type);

  // Content Component
  // We need an internal component to use hooks.

  // Configurations
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
              { x: 200, y: 200 },
              { x: 400, y: 200 },
              { x: 300, y: 400 },
            ],
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
          },
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
            point: { x: 300, y: 300 },
            bounds: { minX: 300, minY: 300, maxX: 300, maxY: 300 },
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
</script>

<!-- Viewer Component using Hooks -->
{#snippet ViewerContent({ type }: { type: string })}
  {@const config = configs[type]}
  {@const getAnnotator = useAnnotator()}

  <!-- State for tool instance -->
  <!-- We must create tool inside effect or component init, but be careful with reactivity -->

  <!-- Logic -->
  {#if config}
    <!-- Tool Activation -->
    <!-- Need reactive reference to viewer. But viewer is available in context? No, hook needs viewer instance. -->
    <!-- The hook `useTool` takes `viewer` getters. -->
    <!-- We need reference to viewer instance. -->
    <!-- AnnotaViewer provides it via binding/callback. -->
    <!-- BUT this snippet is rendered inside Annotator, so context is available? -->
    <!-- `Annotator` component has `viewer` prop. -->
    <!-- `useAnnotator` gives annotator instance which HAS viewer. -->
    <!-- `useTool` requires viewer argument. -> ({ viewer: ... }) -->

    <!-- We need to CAPTURE viewer from `useAnnotator`? -->
    <!-- Or pass it down. -->
    <!-- Let's assume we pass `viewer` to snippet? -->

    <!-- Wait, Svelte Snippets don't support script logic easily inside them for setup? -->
    <!-- We should implement a real component for the content. -->
  {/if}
{/snippet}

<!-- We need a separate component file for the inner logic to handle hooks cleanly -->
<div class="w-full h-screen bg-white">
  <!-- Load Internals dynamically or use switch -->
  {#key type}
    <ExampleWrapper {type} />
  {/key}
</div>
