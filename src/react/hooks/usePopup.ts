/**
 * Hook for managing annotation popup state
 *
 * Automatically shows popup when annotation is selected.
 *
 * @param options Configuration options
 * @returns Popup state and control functions
 *
 * @example
 * ```tsx
 * function MyAnnotationPopup() {
 *   const popup = usePopup();
 *
 *   if (!popup.annotation) return null;
 *
 *   return (
 *     <OSDAnnotationPopup
 *       annotation={popup.annotation}
 *       onClose={popup.hide}
 *     >
 *       <div>
 *         <input
 *           value={popup.annotation.properties?.group || ''}
 *           onChange={(e) => popup.updateProperties(popup.annotation!.id, {
 *             group: e.target.value
 *           })}
 *         />
 *         <button onClick={() => popup.deleteAnnotation(popup.annotation!.id)}>
 *           Delete
 *         </button>
 *       </div>
 *     </OSDAnnotationPopup>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAnnotator, useAnnotationStore } from '../Provider';
import { useSelection } from './useSelection';
import type { Annotation } from '../../core/types';

export interface UsePopupResult {
  /** Currently visible annotation */
  annotation: Annotation | null;

  /** Whether popup is visible */
  visible: boolean;

  /** Show popup for annotation */
  show: (annotationId: string) => void;

  /** Hide popup */
  hide: () => void;

  /** Toggle popup for annotation */
  toggle: (annotationId: string) => void;

  /** Update annotation properties */
  updateProperties: (annotationId: string, properties: Record<string, unknown>) => void;

  /** Update annotation style */
  updateStyle: (annotationId: string, style: Partial<Annotation['style']>) => void;

  /** Delete annotation */
  deleteAnnotation: (annotationId: string) => void;
}

export function usePopup(options: { autoShow?: boolean } = {}): UsePopupResult {
  const { autoShow = false } = options;
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const selection = useSelection();

  const [visibleAnnotationId, setVisibleAnnotationId] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState<Annotation | null>(null);

  // Memoize selectedId to prevent re-running effect when selection array reference changes
  // but the actual ID hasn't changed
  const selectedId = useMemo(() => {
    return selection.length === 1 ? (selection[0]?.id ?? null) : null;
  }, [selection.length, selection[0]?.id]);

  // Determine which annotation ID should be visible
  const activeAnnotationId = autoShow ? selectedId : visibleAnnotationId;

  // Subscribe to store changes to keep annotation data fresh
  useEffect(() => {
    if (!store || !activeAnnotationId) {
      setAnnotation(null);
      return;
    }

    const handleStoreChange = (event: any) => {
      // Check if our annotation was updated
      const updated = event.updated.find((u: any) => u.newValue.id === activeAnnotationId);
      if (updated) {
        setAnnotation(updated.newValue);
        return;
      }

      // Check if our annotation was deleted
      const deleted = event.deleted.find((a: any) => a.id === activeAnnotationId);
      if (deleted) {
        setAnnotation(null);
        setVisibleAnnotationId(null);
      }
    };

    // Initial load
    const ann = store.get(activeAnnotationId);
    setAnnotation(ann || null);

    // Subscribe to updates
    store.observe(handleStoreChange);
    return () => store.unobserve(handleStoreChange);
  }, [store, activeAnnotationId]);

  const show = useCallback((annotationId: string) => {
    setVisibleAnnotationId(annotationId);
  }, []);

  const hide = useCallback(() => {
    setVisibleAnnotationId(null);
    // Also clear selection when hiding popup
    if (annotator) {
      annotator.state.selection.selected = [];
    }
  }, [annotator]);

  const toggle = useCallback((annotationId: string) => {
    setVisibleAnnotationId(prev => (prev === annotationId ? null : annotationId));
  }, []);

  const updateProperties = useCallback(
    (annotationId: string, properties: Record<string, unknown>) => {
      if (!annotator) return;

      const ann = annotator.state.store.get(annotationId);
      if (!ann) return;

      annotator.state.store.update(annotationId, {
        ...ann,
        properties: { ...ann.properties, ...properties },
      });
    },
    [annotator]
  );

  const updateStyle = useCallback(
    (annotationId: string, style: Partial<Annotation['style']>) => {
      if (!annotator) return;

      const ann = annotator.state.store.get(annotationId);
      if (!ann) return;

      annotator.state.store.update(annotationId, {
        ...ann,
        style: { ...ann.style, ...style },
      });
    },
    [annotator]
  );

  const deleteAnnotation = useCallback(
    (annotationId: string) => {
      if (!annotator) return;
      annotator.state.store.delete(annotationId);
      hide();
    },
    [annotator, hide]
  );

  return {
    annotation,
    visible: annotation !== null,
    show,
    hide,
    toggle,
    updateProperties,
    updateStyle,
    deleteAnnotation,
  };
}
