/**
 * Hook to automatically control OpenSeadragon image layer visibility
 *
 * This hook observes the 'image' layer in the layer manager and controls
 * the OpenSeadragon canvas opacity accordingly.
 *
 * @param viewer OpenSeadragon viewer instance
 *
 * @example
 * ```tsx
 * function MyViewer() {
 *   const [viewer, setViewer] = useState<OpenSeadragon.Viewer>();
 *   useImageLayerVisibility(viewer);
 *
 *   return <AnnotaViewer onViewerReady={setViewer} />;
 * }
 * ```
 */

import { useEffect } from 'react';
import type OpenSeadragon from 'openseadragon';
import { useLayer } from './useLayer';

export function useImageLayerVisibility(viewer: OpenSeadragon.Viewer | undefined): void {
  const imageLayer = useLayer('image');

  useEffect(() => {
    if (!viewer || !imageLayer) return;

    // Target the OpenSeadragon canvas element that contains the image
    const osdCanvas = viewer.element?.querySelector('.openseadragon-canvas');
    if (osdCanvas) {
      // Find the canvas element inside (the image canvas, not annotation canvas)
      const imageCanvas = osdCanvas.querySelector('canvas:not(.annota-pixi-canvas)');
      if (imageCanvas instanceof HTMLElement) {
        imageCanvas.style.opacity = imageLayer.visible ? '1' : '0';
      }
    }
  }, [viewer, imageLayer?.visible]);
}
