<script lang="ts">
  import { untrack } from "svelte";
  import type OpenSeadragon from "openseadragon";

  interface Props {
    class?: string;
    style?: string;
    options: OpenSeadragon.Options;
    onViewerReady?: (viewer: OpenSeadragon.Viewer) => void;
  }

  let { class: className, style, options, onViewerReady }: Props = $props();

  let element: HTMLDivElement;
  let viewer: OpenSeadragon.Viewer | undefined = $state(undefined);

  export function getViewer() {
    return viewer;
  }

  $effect(() => {
    if (!element || viewer || typeof window === 'undefined') return;

    // Dynamic import to avoid SSR issues
    import('openseadragon').then((OpenSeadragon) => {
      if (!element || viewer) return; // Check again after async import

      const perfDefaults: Partial<OpenSeadragon.Options> & { drawer?: string } = {
        drawer: "webgl",
        immediateRender: true,
        alwaysBlend: false,
        blendTime: 0.05,
        animationTime: 0.2,
        imageLoaderLimit: 16,
        maxImageCacheCount: 512,
        preload: true,
        timeout: 120000,
        preserveImageSizeOnResize: true,
        smoothTileEdgesMinZoom: Infinity,
        constrainDuringPan: true,
        visibilityRatio: 1.0,
        minZoomImageRatio: 0.8,
        maxZoomPixelRatio: 10,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: false,
        } as any,
      };

      const opts = untrack(() => options);

      const v = OpenSeadragon.default({
        ...perfDefaults,
        ...opts,
        element: element,
      });

      viewer = v;
      untrack(() => onViewerReady?.(v));
    });

    return () => {
      if (viewer) {
        viewer.destroy();
        viewer = undefined;
      }
    };
  });

  $effect(() => {
    if (!viewer || !options.tileSources) return;
    viewer.open(options.tileSources);
  });
</script>

<div
  bind:this={element}
  class={className}
  style="{style ? style + ';' : ''} isolation: isolate;"
></div>
