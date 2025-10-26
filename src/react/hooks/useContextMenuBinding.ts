/**
 * Hook to automatically bind context menu events to the viewer canvas
 *
 * This hook listens for right-click events on the viewer canvas and shows
 * the appropriate context menu (viewer or annotation) based on what was clicked.
 *
 * @param showViewerMenu Function to show viewer context menu
 * @param showAnnotationMenu Function to show annotation context menu
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } = useContextMenu();
 *
 *   // Automatically bind context menu to canvas
 *   useContextMenuBinding(showViewerMenu, showAnnotationMenu);
 *
 *   return (
 *     <ContextMenu position={menuState.position} onClose={hideMenu}>
 *       {menuState.type === 'viewer' && <div>Viewer menu</div>}
 *       {menuState.type === 'annotation' && <div>Annotation menu</div>}
 *     </ContextMenu>
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';
import OpenSeadragon from 'openseadragon';
import { useAnnotator, useAnnotationStore } from '../Provider';
import type { Annotation } from '../../core/types';

export function useContextMenuBinding(
  showViewerMenu: (x: number, y: number) => void,
  showAnnotationMenu: (annotation: Annotation, x: number, y: number) => void
): void {
  const annotator = useAnnotator();
  const store = useAnnotationStore();

  useEffect(() => {
    if (!annotator?.viewer || !store) return;

    const canvas = annotator.viewer.canvas;
    if (!canvas) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      // Get the click position in image coordinates
      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const imageCoords = annotator.viewer.viewport.viewerElementToImageCoordinates(
        new OpenSeadragon.Point(offsetX, offsetY)
      );

      // Use the same hit tolerance as left-click selection (5 pixels in image space / zoom)
      // This ensures consistent behavior between left-click and right-click
      const hitTolerance = 5 / annotator.viewer.viewport.getZoom();

      // Do a hit test at the click position with tolerance for small annotations (like points)
      const annotation = store.getAt(imageCoords.x, imageCoords.y, undefined, hitTolerance);

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
  }, [annotator, store, showViewerMenu, showAnnotationMenu]);
}
