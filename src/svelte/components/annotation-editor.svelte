<script lang="ts">
  /**
   * Annotation Editor - Svelte Version
   *
   * Renders SVG overlay with editing handles for selected annotations.
   * Syncs SVG transform with OpenSeadragon viewport.
   * Ported from src/react/Editor.tsx
   */
  import { onMount } from "svelte";
  import OpenSeadragon from "openseadragon";
  import { selection } from "../selection.svelte";
  import { getAnnotator } from "../annotator";
  import type { Shape, RectangleShape } from "annota";
  import RectangleEditor from "./editors/rectangle-editor.svelte";

  interface Props {
    viewer: OpenSeadragon.Viewer;
  }

  let { viewer }: Props = $props();

  let svgEl: SVGSVGElement;
  let transform = $state("");
  let scale = $state(1);

  // Get selected annotations (returns a getter function)
  const getSelectedAnnotations = selection();

  // Only support single selection for now
  const annotation = $derived(getSelectedAnnotations()[0]);

  // Get annotator instance from context
  const getAnnotatorFn = getAnnotator();
  const annotator = $derived(getAnnotatorFn());

  /**
   * Update SVG transform to match OpenSeadragon viewport
   * This must match the PixiJS stage transformation exactly
   */
  const updateTransform = () => {
    const containerWidth = viewer.viewport.getContainerSize().x;
    const zoom = viewer.viewport.getZoom(true);
    const flipped = viewer.viewport.getFlip();

    // Calculate scale (same as Pixi.js)
    const scaleY = (zoom * containerWidth) / viewer.world.getContentFactor();
    const scaleX = flipped ? -scaleY : scaleY;

    // Get viewport bounds in image coordinates (same as Pixi.js)
    const viewportBounds = viewer.viewport.viewportToImageRectangle(
      viewer.viewport.getBounds(true)
    );

    // Calculate position (same as Pixi.js)
    const dx = -viewportBounds.x * scaleY;
    const dy = -viewportBounds.y * scaleY;

    // Get rotation (OSD 4+)
    const rotation = viewer.viewport.getRotation
      ? viewer.viewport.getRotation()
      : 0;

    // Build transform matching Pixi.js stage
    transform = `translate(${dx}, ${dy}) scale(${scaleX}, ${scaleY}) rotate(${rotation})`;
    scale = scaleY;
  };

  onMount(() => {
    updateTransform();
    viewer.addHandler("update-viewport", updateTransform);
    viewer.addHandler("animation", updateTransform);

    return () => {
      viewer.removeHandler("update-viewport", updateTransform);
      viewer.removeHandler("animation", updateTransform);
    };
  });

  /**
   * Handle shape change - update annotation in store
   */
  const handleChange = (newShape: Shape) => {
    if (!annotation || !annotator) return;
    annotator.updateAnnotation(annotation.id, {
      ...annotation,
      shape: newShape,
    });
  };

  /**
   * Get the appropriate editor for this shape type
   */
  const getEditor = () => {
    if (!annotation) return null;

    const shapeType = annotation.shape.type;

    // Currently only rectangle is implemented
    if (shapeType === "rectangle") {
      return {
        component: RectangleEditor,
        props: {
          shape: annotation.shape as RectangleShape,
          viewportScale: scale,
          viewer,
          svgEl,
          onchange: handleChange,
        },
      };
    }

    console.warn(`[AnnotationEditor] No editor for shape type: ${shapeType}`);
    return null;
  };

  const editor = $derived(getEditor());
</script>

<!-- SVG overlay synced with OpenSeadragon viewport -->
<svg
  bind:this={svgEl}
  class="annota-svg-layer"
  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; touch-action: none; z-index: 1000; pointer-events: none;"
>
  <g class="annota-transform-group" {transform} style="pointer-events: all;">
    {#if editor}
      {@const EditorComponent = editor.component}
      <EditorComponent {...editor.props} />
    {/if}
  </g>
</svg>

<style>
  .annota-svg-layer :global(.a9s-corner-handle) {
    fill: #fff;
    stroke: #3182ed;
    stroke-width: 1.5px;
    vector-effect: non-scaling-stroke;
    pointer-events: all;
  }
</style>
