<script lang="ts">
  import { untrack } from "svelte";
  import OpenSeadragon from "openseadragon";
  import {
    createOpenSeadragonAnnotator,
    type OpenSeadragonAnnotatorOptions,
    type OpenSeadragonAnnotator,
  } from "annota";
  import { setAnnotator } from "../annotator";
  import AnnotationEditor from "./annotation-editor.svelte";

  interface Props extends Omit<OpenSeadragonAnnotatorOptions, "store"> {
    viewer: OpenSeadragon.Viewer | undefined;
    children?: import("svelte").Snippet;
    [key: string]: any; // Allow other props for options
  }

  let { viewer, children, ...options }: Props = $props();

  const setAnnotatorFn = setAnnotator();
  let annotatorInstance: OpenSeadragonAnnotator | undefined = $state(undefined);

  $effect(() => {
    if (!viewer || !viewer.canvas) return;

    let cancelled = false;

    // Untrack options so we only re-init when viewer changes, matching React behavior
    const opts = untrack(() => options) as OpenSeadragonAnnotatorOptions;

    createOpenSeadragonAnnotator(viewer, opts).then((annotator) => {
      if (cancelled) {
        annotator.destroy();
        return;
      }
      annotatorInstance = annotator;
      setAnnotatorFn(annotator);
    });

    return () => {
      cancelled = true;
      if (annotatorInstance) {
        annotatorInstance.destroy();
        annotatorInstance = undefined;
      }
      setAnnotatorFn(undefined);
    };
  });
</script>

{#if viewer}
  <AnnotationEditor {viewer} />
{/if}

{@render children?.()}
