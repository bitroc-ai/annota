<script lang="ts">
  /**
   * Selection Layer
   *
   * SVG overlay that renders editing handles for selected annotations.
   * Works alongside the PIXI layer which renders all annotations.
   *
   * This component portals its content into the OpenSeadragon canvas container
   * to ensure proper coordinate alignment with the PIXI annotation layer.
   */
  import { onMount } from "svelte";
  import type OpenSeadragon from "openseadragon";
  import { RectangleEditor } from "./editors";
  import type { Annotation, Shape, RectangleShape } from "../../core/types";
  import type { OpenSeadragonAnnotator } from "../../adapters/openseadragon/annotator";

  interface Props {
    annotator: OpenSeadragonAnnotator;
    viewer: OpenSeadragon.Viewer;
  }

  let { annotator, viewer }: Props = $props();

  // Selected annotation from annotator state
  let selectedAnnotation: Annotation | null = $state(null);

  // Portal target inside OSD canvas
  let portalTarget: HTMLDivElement | null = $state(null);

  // SVG element reference
  let svgEl: SVGSVGElement | undefined = $state(undefined);

  // Transform and scale for the viewport
  let layerTransform = $state("");
  let viewportScale = $state(1);

  // Setup portal container inside OSD canvas
  onMount(() => {
    const osdCanvas = viewer.element.querySelector(
      ".openseadragon-canvas",
    ) as HTMLElement;
    if (!osdCanvas) {
      console.warn("[SelectionLayer] OpenSeadragon canvas not found");
      return;
    }

    // Create portal container
    const container = document.createElement("div");
    container.className = "annota-selection-portal";
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow: visible;
    `;
    osdCanvas.appendChild(container);
    portalTarget = container;

    // Update viewport transform
    const onUpdateViewport = () => {
      const containerWidth = viewer.viewport.getContainerSize().x;
      const zoom = viewer.viewport.getZoom(true);
      const flipped = viewer.viewport.getFlip();

      const p = viewer.viewport.pixelFromPoint(
        new (window as any).OpenSeadragon.Point(0, 0),
        true,
      );
      if (flipped) p.x = containerWidth - p.x;

      const scaleY = (zoom * containerWidth) / viewer.world.getContentFactor();
      const scaleX = flipped ? -scaleY : scaleY;

      // @ts-ignore getRotation(true) only since OSD 4
      const rotation = viewer.viewport.getRotation(true);

      layerTransform = `translate(${p.x}, ${p.y}) scale(${scaleX}, ${scaleY}) rotate(${rotation})`;
      viewportScale = Math.abs(scaleY);
    };

    onUpdateViewport();
    viewer.addHandler("update-viewport", onUpdateViewport);
    viewer.addHandler("animation", onUpdateViewport);
    viewer.addHandler("animation-finish", onUpdateViewport);

    return () => {
      viewer.removeHandler("update-viewport", onUpdateViewport);
      viewer.removeHandler("animation", onUpdateViewport);
      viewer.removeHandler("animation-finish", onUpdateViewport);
      container.remove();
      portalTarget = null;
    };
  });

  // Sync with selection state
  $effect(() => {
    const onSelectionChanged = () => {
      const selectedIds = annotator.state.selection.getSelected();
      if (selectedIds.length === 1) {
        const ann = annotator.state.store.get(selectedIds[0]);
        if (ann && ann !== selectedAnnotation) {
          selectedAnnotation = ann;
        }
      } else if (selectedIds.length === 0 || selectedIds.length > 1) {
        // Deselect if 0 or > 1 selected
        if (selectedAnnotation !== null) {
          selectedAnnotation = null;
        }
      }
    };

    const onUpdateAnnotation = (updated: Annotation) => {
      if (selectedAnnotation && selectedAnnotation.id === updated.id) {
        selectedAnnotation = updated;
      }
    };

    // Initial check
    onSelectionChanged();

    annotator.on("selectionChanged", onSelectionChanged);
    annotator.on("updateAnnotation", onUpdateAnnotation);

    return () => {
      annotator.off("selectionChanged", onSelectionChanged);
      annotator.off("updateAnnotation", onUpdateAnnotation);
    };
  });

  // Handle shape change from editor
  const handleShapeChange = (newShape: Shape) => {
    if (!selectedAnnotation) return;

    annotator.updateAnnotation(selectedAnnotation.id, {
      ...selectedAnnotation,
      shape: newShape,
    });
  };

  // Handle grab - disable OSD panning
  const handleGrab = () => {
    viewer.setMouseNavEnabled(false);
  };

  // Handle release - re-enable OSD panning
  const handleRelease = () => {
    viewer.setMouseNavEnabled(true);
  };

  // Portal action to move element to target
  function portal(node: Element) {
    if (portalTarget) {
      portalTarget.appendChild(node);
    }

    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      },
    };
  }
</script>

{#if selectedAnnotation && portalTarget}
  <svg class="a9s-selection-layer" bind:this={svgEl} use:portal>
    <g transform={layerTransform}>
      {#if selectedAnnotation.shape.type === "rectangle"}
        <RectangleEditor
          shape={selectedAnnotation.shape as RectangleShape}
          {viewportScale}
          {viewer}
          {svgEl}
          onchange={handleShapeChange}
          ongrab={handleGrab}
          onrelease={handleRelease}
        />
      {/if}
    </g>
  </svg>
{/if}

<style>
  .a9s-selection-layer {
    overflow: visible;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    outline: none;
    pointer-events: none;
  }

  .a9s-selection-layer :global(g) {
    pointer-events: all;
  }
</style>
