import OpenSeadragon from 'openseadragon';
import type { Annotation } from '../core/types';
import { getAnnotator } from './annotator';

export function contextMenuBinding(
  showViewerMenu: (x: number, y: number) => void,
  showAnnotationMenu: (annotation: Annotation, x: number, y: number) => void
): void {
  const getAnnotatorFn = getAnnotator();

  $effect(() => {
    if (typeof window === 'undefined') return;
    
    const annotator = getAnnotatorFn();
    if (!annotator?.viewer) return;

    const store = annotator.state.store;
    const canvas = annotator.viewer.canvas;

    if (!canvas) return;

    let cleanup: (() => void) | null = null;

    // Dynamic import to avoid SSR issues
    import('openseadragon').then((OSD) => {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const imageCoords = annotator.viewer.viewport.viewerElementToImageCoordinates(
          new OSD.default.Point(offsetX, offsetY)
        );

        const hitTolerance = 5 / annotator.viewer.viewport.getZoom();
        const annotation = store.getAt(imageCoords.x, imageCoords.y, undefined, hitTolerance);

        if (annotation) {
          showAnnotationMenu(annotation, e.clientX, e.clientY);
        } else {
          showViewerMenu(e.clientX, e.clientY);
        }
      };

      canvas.addEventListener('contextmenu', handleContextMenu);
      cleanup = () => {
        canvas.removeEventListener('contextmenu', handleContextMenu);
      };
    });

    return () => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    };
  });
}

