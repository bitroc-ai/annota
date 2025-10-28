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
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!annotator) return;

    // Subscribe to selection changes via observer
    const handleSelectionChange = () => {
      const currentIds = annotator.state.selection.getSelected();
      setSelectedIds(currentIds);
    };

    // Set initial selection
    handleSelectionChange();

    // Observe selection changes
    annotator.state.selection.observe(handleSelectionChange);

    return () => {
      annotator.state.selection.unobserve(handleSelectionChange);
    };
  }, [annotator]);

  // Subscribe to store changes to re-render when selected annotations are updated
  useEffect(() => {
    if (!store || selectedIds.length === 0) return;

    const handleStoreChange = (event: any) => {
      // Check if any updated annotations are in the selection
      const updatedIds = event.updated.map((u: any) => u.newValue.id);
      const hasSelectedUpdate = updatedIds.some((id: string) => selectedIds.includes(id));

      if (hasSelectedUpdate) {
        // Force re-render to get updated annotations from store
        forceUpdate(prev => prev + 1);
      }
    };

    store.observe(handleStoreChange);

    return () => {
      store.unobserve(handleStoreChange);
    };
  }, [store, selectedIds]);

  if (!store) return [];

  return selectedIds.map(id => store.get(id)).filter(Boolean) as Annotation[];
}
