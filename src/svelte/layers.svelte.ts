/**
 * Function to get all layers
 * Returns a getter function that provides reactive access to layers
 */

import { getAnnotator } from './annotator';
import type { Layer } from 'annota';

export function layers(): () => readonly Layer[] {
  const getAnnotatorFn = getAnnotator();
  let layersList: Layer[] = $state([]);

  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator) {
      layersList = [];
      return;
    }

    const layerManager = annotator.unsafeState.layerManager;
    if (!layerManager) {
      layersList = [];
      return;
    }

    const handleLayersChange = () => {
      layersList = [...layerManager.getAllLayers()];
    };

    // Initial state
    handleLayersChange();

    // Observe layer changes
    layerManager.observe(handleLayersChange);

    return () => {
      layerManager.unobserve(handleLayersChange);
    };
  });

  // Return a getter function to preserve reactivity
  return () => layersList;
}
