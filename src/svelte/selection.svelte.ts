/**
 * Function to get currently selected annotations
 * Returns a getter function to access the reactive selection
 */

import { getAnnotator } from "./annotator";
import type { Annotation } from "annota";

export function selection(): () => Annotation[] {
  const getAnnotatorFn = getAnnotator();
  let selectedIds: string[] = $state([]);

  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator) {
      selectedIds = [];
      return;
    }

    const store = annotator.state.store;
    if (!store) {
      selectedIds = [];
      return;
    }

    // Subscribe to selection changes via observer
    const handleSelectionChange = () => {
      const currentIds = annotator.state.selection.getSelected();
      selectedIds = currentIds;
    };

    // Set initial selection
    handleSelectionChange();

    // Observe selection changes
    annotator.state.selection.observe(handleSelectionChange);

    // Subscribe to store changes to re-render when selected annotations are updated
    const handleStoreChange = (event: any) => {
      // Check if any updated annotations are in the selection
      const updatedIds = event.updated.map((u: any) => u.newValue.id);
      const hasSelectedUpdate = updatedIds.some((id: string) =>
        selectedIds.includes(id)
      );

      if (hasSelectedUpdate) {
        // Update selectedIds to trigger reactivity
        selectedIds = [...annotator.state.selection.getSelected()];
      }
    };

    store.observe(handleStoreChange);

    return () => {
      annotator.state.selection.unobserve(handleSelectionChange);
      store.unobserve(handleStoreChange);
    };
  });

  // Memoize the selected annotations
  const selectedAnnotations = $derived.by(() => {
    const annotator = getAnnotatorFn();
    const store = annotator?.state.store;
    if (!store) return [];
    return selectedIds
      .map((id) => store.get(id))
      .filter(Boolean) as Annotation[];
  });

  // Return a getter function to maintain reactivity
  return () => selectedAnnotations;
}
