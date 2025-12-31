<script lang="ts">
  import { useTool, useAnnotator } from "annota/svelte";

  let { config, viewer }: { config: any; viewer: any } = $props();
  const getAnnotator = useAnnotator();

  // Tool
  // Create tool instance only when config changes (key approach in parent handles this)
  let toolInstance = new config.Tool();

  useTool({
    viewer: () => viewer,
    handler: () => toolInstance,
    enabled: () => true,
  });

  // Initial Data
  $effect(() => {
    const annotator = getAnnotator();
    if (annotator && config.initial) {
      // Clear and add
      // annotator.state.store.clear(); // Optional
      config.initial.forEach((ann: any) => {
        try {
          annotator.state.store.add(ann);
        } catch {}
      });
    }
  });
</script>

<!-- No UI, just logic -->
