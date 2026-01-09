import OpenSeadragon from 'openseadragon';
import type { Annotation } from '../core/types';
import { getContext } from 'svelte';
import { ANNOTA_CONTEXT_KEY, type AnnotaContextValue } from './context';

export function contextMenuBinding(
  showViewerMenu: (x: number, y: number) => void,
  showAnnotationMenu: (annotation: Annotation, x: number, y: number) => void
): void {
  // Get context once (context object is stable, but its getter is reactive)
  let context: AnnotaContextValue | undefined;
  try {
    context = getContext<AnnotaContextValue>(ANNOTA_CONTEXT_KEY);
  } catch {
    // Context not available (SSR or outside provider)
  }

  // Make annotator access explicitly reactive using $derived
  const annotator = $derived(context?.annotator);

  $effect(() => {
    if (typeof window === 'undefined') return;
    
    // Use the reactive annotator from $derived
    if (!annotator?.viewer) return;

    const store = annotator.state.store;
    const canvas = annotator.viewer.canvas;

    if (!canvas || !store) return;

    // Access functions directly in the handler to ensure they're current
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const imageCoords = annotator.viewer.viewport.viewerElementToImageCoordinates(
        new OpenSeadragon.Point(offsetX, offsetY)
      );

      const hitTolerance = 5 / annotator.viewer.viewport.getZoom();
      const annotation = store.getAt(imageCoords.x, imageCoords.y, undefined, hitTolerance);

      // Access functions directly here - they're captured from the closure
      if (annotation) {
        showAnnotationMenu(annotation, e.clientX, e.clientY);
      } else {
        showViewerMenu(e.clientX, e.clientY);
      }
    };

    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  });
}

