<script lang="ts">
  /**
   * OSD Layer - Viewport Synchronization
   * 
   * Syncs an SVG layer with OpenSeadragon viewport transforms.
   * Ported from annotorious-openseadragon/src/annotation/svg/OSDLayer.svelte
   */
  import { onMount } from 'svelte';
  import type OpenSeadragon from 'openseadragon';

  interface Props {
    viewer: OpenSeadragon.Viewer;
    children?: import('svelte').Snippet<[{ transform: string; scale: number }]>;
  }

  let { viewer, children }: Props = $props();

  // Current layer scale
  let scale = $state(1);

  // CSS layer transform
  let layerTransform = $state('');

  const onUpdateViewport = () => {
    const containerWidth = viewer.viewport.getContainerSize().x;

    const zoom = viewer.viewport.getZoom(true);
    const flipped = viewer.viewport.getFlip();

    const p = viewer.viewport.pixelFromPoint(new (window as any).OpenSeadragon.Point(0, 0), true);
    if (flipped)
      p.x = containerWidth - p.x;

    const scaleY = zoom * containerWidth / viewer.world.getContentFactor();
    const scaleX = flipped ? -scaleY : scaleY;

    // @ts-ignore note: getRotation(true <- realtime value) only since OSD 4!
    const rotation = viewer.viewport.getRotation(true);

    layerTransform = `translate(${p.x}, ${p.y}) scale(${scaleX}, ${scaleY}) rotate(${rotation})`;

    scale = zoom * containerWidth / viewer.world.getContentFactor();
  };

  onMount(() => {
    onUpdateViewport();
    viewer.addHandler('update-viewport', onUpdateViewport);

    return () => {
      viewer.removeHandler('update-viewport', onUpdateViewport);
    };
  });
</script>

{@render children?.({ transform: layerTransform, scale })}
