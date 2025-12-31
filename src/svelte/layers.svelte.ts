/**
 * Function to get all layers
 */

import { getAnnotator } from './annotator';
import type { Layer } from '../core/layer';

export function layers(): Layer[] {
  const getAnnotatorFn = getAnnotator();
  let layersList: Layer[] = $state([]);

  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator) {
      layersList = [];
      return;
    }

    const layerManager = annotator.state.layerManager;
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

  return layersList;
}

