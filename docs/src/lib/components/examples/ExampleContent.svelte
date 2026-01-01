<script lang="ts">
  import { AnnotaProvider, Annotator, Viewer, tool } from "annota/svelte";
  import { RectangleTool, PolygonTool, PointTool } from "annota";
  import OpenSeadragon from "openseadragon";
  import { onMount } from "svelte";

  interface Props {
    type: string;
  }

  let { type }: Props = $props();
  let viewer: OpenSeadragon.Viewer | undefined = $state(undefined);

  const viewerOptions = {
    tileSources: {
      type: "image" as const,
      url: "/playground/images/test/0.png",
    },
    showNavigationControl: false,
    visibilityRatio: 1,
    minZoomLevel: 0.5,
    maxZoomLevel: 10,
    gestureSettingsMouse: {
      clickToZoom: false,
      dblClickToZoom: false,
    },
  };

  // Activate the tool based on type at the top level
  tool({
    viewer: () => viewer,
    handler: () => {
      if (!viewer) return null;
      if (type === "rectangle") return new RectangleTool();
      if (type === "polygon") return new PolygonTool();
      if (type === "points") return new PointTool();
      return null;
    },
    enabled: () => !!viewer,
  });
</script>

<div class="w-full h-full">
  <AnnotaProvider>
    <Viewer
      class="w-full h-full"
      options={viewerOptions}
      onViewerReady={(v) => {
        viewer = v;
      }}
    />
    {#if viewer}
      <Annotator {viewer} />
    {/if}
  </AnnotaProvider>
</div>

