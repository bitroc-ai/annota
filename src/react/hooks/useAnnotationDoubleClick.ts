/**
 * Hook to listen for double-click on annotations
 *
 * @param viewer OpenSeadragon viewer instance
 * @param onDoubleClick Callback when annotation is double-clicked
 *
 * @example
 * ```tsx
 * // Enter vertex editing mode on double-click
 * const { startEditing } = useEditing();
 * useAnnotationDoubleClick(viewer, (annotation) => {
 *   const editorConfig = getEditorConfig(annotation);
 *   if (editorConfig?.supportsVertexEditing) {
 *     startEditing(annotation.id);
 *   }
 * });
 * ```
 */

import { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';
import { useAnnotator, useAnnotationStore } from '../Provider';
import type { Annotation } from '../../core/types';

export function useAnnotationDoubleClick(
  viewer: OpenSeadragon.Viewer | undefined,
  onDoubleClick: (annotation: Annotation) => void
): void {
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  useEffect(() => {
    if (!viewer || !annotator || !store || !viewer.element) return;

    const handleClick = (event: any) => {
      // Get annotation at click position
      const canvas = viewer.element.querySelector('.openseadragon-canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const imageCoords = viewer.viewport.viewerElementToImageCoordinates(
        new OpenSeadragon.Point(offsetX, offsetY)
      );

      const annotation = store.getAt(imageCoords.x, imageCoords.y);
      if (!annotation) return;

      const now = Date.now();
      const lastClick = lastClickRef.current;

      // Check if this is a double-click (within 300ms and same annotation)
      if (lastClick && lastClick.id === annotation.id && now - lastClick.time < 300) {
        onDoubleClick(annotation);
        lastClickRef.current = null; // Reset after double-click
      } else {
        lastClickRef.current = { id: annotation.id, time: now };
      }
    };

    viewer.element.addEventListener('click', handleClick);

    return () => {
      // Check if viewer.element still exists before removing listener
      if (viewer?.element) {
        viewer.element.removeEventListener('click', handleClick);
      }
    };
  }, [viewer, annotator, store, onDoubleClick]);
}
