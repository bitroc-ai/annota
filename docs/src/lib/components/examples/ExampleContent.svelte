<script lang="ts">
  import { AnnotaProvider, Annotator, Viewer } from "annota/svelte";
  import OpenSeadragon from "openseadragon";
  import ToolActivator from "./ToolActivator.svelte";

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
      <Annotator {viewer}>
        <ToolActivator {viewer} {type} />
      </Annotator>
    {/if}
  </AnnotaProvider>
</div>

