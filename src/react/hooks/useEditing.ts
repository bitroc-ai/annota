/**
 * Hook to manage annotation editing state
 *
 * Provides control over which annotation is currently being edited.
 * Only one annotation can be in edit mode at a time.
 *
 * @example
 * ```tsx
 * function MyEditor() {
 *   const { editingAnnotation, startEditing, stopEditing, isEditing } = useEditing();
 *
 *   return (
 *     <button onClick={() => isEditing(annotation.id) ? stopEditing() : startEditing(annotation.id)}>
 *       {isEditing(annotation.id) ? 'Stop Editing' : 'Edit Vertices'}
 *     </button>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { useAnnotator, useAnnotationStore } from '../Provider';
import type { Annotation } from '../../core/types';

export interface UseEditingResult {
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

export function useEditing(): UseEditingResult {
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editMode, setEditMode] = useState<'vertices' | undefined>();
  const [annotation, setAnnotation] = useState<Annotation | null>(null);

  // Poll editing state (simple approach - could be improved with events)
  useEffect(() => {
    if (!annotator) return;

    const interval = setInterval(() => {
      const currentId = annotator.state.editing.current;
      const currentMode = annotator.state.editing.mode;

      if (currentId !== editingId || currentMode !== editMode) {
        setEditingId(currentId);
        setEditMode(currentMode);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [annotator, editingId, editMode]);

  // Subscribe to store changes to keep annotation data fresh
  useEffect(() => {
    if (!store || !editingId) {
      setAnnotation(null);
      return;
    }

    const handleStoreChange = (event: any) => {
      // Check if our annotation was updated
      const updated = event.updated.find((u: any) => u.newValue.id === editingId);
      if (updated) {
        setAnnotation(updated.newValue);
        return;
      }

      // Check if our annotation was deleted
      const deleted = event.deleted.find((a: any) => a.id === editingId);
      if (deleted) {
        setAnnotation(null);
        setEditingId(undefined);
        // Clear editing state in annotator
        if (annotator) {
          annotator.state.editing.current = undefined;
          annotator.state.editing.mode = undefined;
        }
      }
    };

    // Initial load
    const ann = store.get(editingId);
    setAnnotation(ann || null);

    // Subscribe to updates
    store.observe(handleStoreChange);
    return () => store.unobserve(handleStoreChange);
  }, [store, editingId, annotator]);

  const startEditing = useCallback(
    (annotationId: string, mode: 'vertices' | undefined = 'vertices') => {
      if (!annotator) return;

      annotator.state.editing.current = annotationId;
      annotator.state.editing.mode = mode;
      setEditingId(annotationId);
      setEditMode(mode);
    },
    [annotator]
  );

  const stopEditing = useCallback(() => {
    if (!annotator) return;

    annotator.state.editing.current = undefined;
    annotator.state.editing.mode = undefined;
    setEditingId(undefined);
    setEditMode(undefined);
  }, [annotator]);

  const isEditing = useCallback(
    (annotationId: string) => {
      return editingId === annotationId;
    },
    [editingId]
  );

  return {
    editingAnnotation: annotation,
    editingId,
    editMode,
    startEditing,
    stopEditing,
    isEditing,
  };
}
