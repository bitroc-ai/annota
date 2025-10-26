/**
 * Hook to get currently hovered annotation
 */

import { useEffect, useState } from 'react';
import { useAnnotator, useAnnotationStore } from '../Provider';
import type { Annotation } from '../../core/types';

export function useHover(): Annotation | undefined {
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const [hoveredId, setHoveredId] = useState<string>();

  useEffect(() => {
    if (!annotator) return;

    // Poll hover state (simple approach - could be improved with events)
    const interval = setInterval(() => {
      const currentId = annotator.state.hover.current;
      if (currentId !== hoveredId) {
        setHoveredId(currentId);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [annotator, hoveredId]);

  return hoveredId && store ? store.get(hoveredId) : undefined;
}
