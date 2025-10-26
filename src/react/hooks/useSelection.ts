/**
 * Hook to get currently selected annotations
 */

import { useEffect, useState } from 'react';
import { useAnnotator, useAnnotationStore } from '../Provider';
import type { Annotation } from '../../core/types';

export function useSelection(): Annotation[] {
  const annotator = useAnnotator();
  const store = useAnnotationStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!annotator) return;

    // Poll selection state (simple approach - could be improved with events)
    const interval = setInterval(() => {
      const currentIds = annotator.state.selection.selected;
      // Use functional update to avoid including selectedIds in dependencies
      setSelectedIds(prev => {
        if (JSON.stringify(currentIds) !== JSON.stringify(prev)) {
          return [...currentIds];
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [annotator]); // Remove selectedIds from dependencies

  if (!store) return [];

  return selectedIds.map(id => store.get(id)).filter(Boolean) as Annotation[];
}
