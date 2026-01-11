<script lang="ts">
  import { setContext } from "svelte";
  import { ANNOTA_CONTEXT_KEY, type AnnotaContextValue } from "../context";
  import type { OpenSeadragonAnnotator } from "annota";

  interface Props {
    children: import("svelte").Snippet;
  }

  let { children }: Props = $props();
  let annotator: OpenSeadragonAnnotator | undefined = $state(undefined);

  function setAnnotator(newAnnotator: OpenSeadragonAnnotator | undefined) {
    annotator = newAnnotator;
  }

  setContext<AnnotaContextValue>(ANNOTA_CONTEXT_KEY, {
    get annotator() {
      return annotator;
    },
    setAnnotator,
  });
</script>

{@render children()}
