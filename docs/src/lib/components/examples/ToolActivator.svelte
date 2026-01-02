<script lang="ts">
  import { tool, getAnnotator } from "annota/svelte";
  import { RectangleTool, PolygonTool, PointTool } from "annota";
  import type OpenSeadragon from "openseadragon";

  interface Props {
    viewer: OpenSeadragon.Viewer | undefined;
    type: string;
  }

  let { viewer, type }: Props = $props();

  // Create tool instance once based on type
  const toolInstance = $derived.by(() => {
    if (type === "rectangle") return new RectangleTool();
    if (type === "polygon") return new PolygonTool();
    if (type === "points") return new PointTool();
    return null;
  });

  // Activate the tool - this will wait for annotator to be available
  tool({
    viewer: () => viewer,
    handler: () => toolInstance,
    enabled: () => {
      const annotator = getAnnotator()();
      return !!viewer && !!toolInstance && !!annotator;
    },
  });
</script>

