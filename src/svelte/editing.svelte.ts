/**
 * Function to manage annotation editing state
 *
 * Provides control over which annotation is currently being edited.
 * Only one annotation can be in edit mode at a time.
 */

import { getAnnotator } from './annotator';
import type { Annotation } from '../core/types';

export interface EditingOptions {
  /** Automatically exit editing mode when clicking outside annotation (default: true) */
  exitOnClickOutside?: boolean;
}

export interface EditingResult {
  /** Currently editing annotation (null if none) */
  editingAnnotation: Annotation | null;

  /** ID of the annotation being edited */
  editingId: string | undefined;

  /** Current edit mode */
  editMode: 'vertices' | undefined;

  /** Start editing an annotation */
  startEditing: (annotationId: string, mode?: 'vertices') => void;

  /** Stop editing */
  stopEditing: () => void;

  /** Check if a specific annotation is being edited */
  isEditing: (annotationId: string) => boolean;
}

export function editing(options: EditingOptions = {}): EditingResult {
  const { exitOnClickOutside = true } = options;
  const getAnnotatorFn = getAnnotator();
  let editingId: string | undefined = $state(undefined);
  let editMode: 'vertices' | undefined = $state(undefined);
  let annotation: Annotation | null = $state(null);

  // Poll editing state (simple approach - could be improved with events)
  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator) return;

    const interval = setInterval(() => {
      const currentId = annotator.unsafeState.editing.current;
      const currentMode = annotator.unsafeState.editing.mode;

      if (currentId !== editingId || currentMode !== editMode) {
        editingId = currentId;
        editMode = currentMode;
      }
    }, 50);

    return () => clearInterval(interval);
  });

  // Subscribe to store changes to keep annotation data fresh
  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator || !editingId) {
      annotation = null;
      return;
    }

    const store = annotator.unsafeState.store;
    if (!store) {
      annotation = null;
      return;
    }

    const handleStoreChange = (event: any) => {
      // Check if our annotation was updated
      const updated = event.updated.find((u: any) => u.newValue.id === editingId);
      if (updated) {
        annotation = updated.newValue;
        return;
      }

      // Check if our annotation was deleted
      const deleted = event.deleted.find((a: any) => a.id === editingId);
      if (deleted) {
        annotation = null;
        editingId = undefined;
        // Clear editing state in annotator
        if (annotator) {
          annotator.unsafeState.editing.current = undefined;
          annotator.unsafeState.editing.mode = undefined;
        }
      }
    };

    // Initial load
    const ann = store.get(editingId);
    annotation = ann || null;

    // Subscribe to updates
    store.observe(handleStoreChange);
    return () => store.unobserve(handleStoreChange);
  });

  function startEditing(annotationId: string, mode: 'vertices' | undefined = 'vertices') {
    const annotator = getAnnotatorFn();
    if (!annotator) return;

    annotator.unsafeState.editing.current = annotationId;
    annotator.unsafeState.editing.mode = mode;
    editingId = annotationId;
    editMode = mode;
  }

  function stopEditing() {
    const annotator = getAnnotatorFn();
    if (!annotator) return;

    annotator.unsafeState.editing.current = undefined;
    annotator.unsafeState.editing.mode = undefined;
    editingId = undefined;
    editMode = undefined;
  }

  function isEditing(annotationId: string): boolean {
    return editingId === annotationId;
  }

  // Click outside to exit edit mode (optional)
  $effect(() => {
    if (!exitOnClickOutside || !editingId) return;
    const annotator = getAnnotatorFn();
    if (!annotator?.viewer) return;

    const handleCanvasClick = (event: any) => {
      // Get annotation at click position
      const canvas = annotator.viewer.element.querySelector('.openseadragon-canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const offsetX = event.originalEvent.clientX - rect.left;
      const offsetY = event.originalEvent.clientY - rect.top;

      const imageCoords = annotator.viewer.viewport.viewerElementToImageCoordinates(
        new (window as any).OpenSeadragon.Point(offsetX, offsetY)
      );

      const clickedAnnotation = annotator.unsafeState.store.getAt(imageCoords.x, imageCoords.y);

      if (!clickedAnnotation) {
        // Clicked on empty space - exit editing mode
        stopEditing();
      } else if (clickedAnnotation.id !== editingId) {
        // Clicked on a different annotation
        // Check if it supports vertex editing (has points array)
        const supportsVertexEditing =
          clickedAnnotation.shape.type === 'polygon' ||
          clickedAnnotation.shape.type === 'freehand' ||
          clickedAnnotation.shape.type === 'multipolygon';

        if (supportsVertexEditing) {
          // Switch to editing the new annotation
          startEditing(clickedAnnotation.id, 'vertices');
        } else {
          // Annotation doesn't support vertex editing - exit editing mode
          stopEditing();
        }
      }
      // If clicked on the same annotation being edited, do nothing (stay in edit mode)
    };

    annotator.viewer.addHandler('canvas-click', handleCanvasClick);

    return () => {
      if (annotator?.viewer) {
        annotator.viewer.removeHandler('canvas-click', handleCanvasClick);
      }
    };
  });

  return {
    get editingAnnotation() { return annotation; },
    get editingId() { return editingId; },
    get editMode() { return editMode; },
    startEditing,
    stopEditing,
    isEditing,
  };
}

