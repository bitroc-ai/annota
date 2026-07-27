/**
 * Hook to get all layers
 */

import { useEffect, useState } from 'react';
import { useAnnotator } from '../provider';
import type { Layer } from '../../core/layer';

export function useLayers(): Layer[] {
  const annotator = useAnnotator();
  const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    if (!annotator) return;

    const layerManager = annotator.unsafeState.layerManager;
    if (!layerManager) return;

    const handleChange = () => {
      setLayers(layerManager.getAllLayers());
    };

    // Initial load
    handleChange();

    layerManager.observe(handleChange);
    return () => layerManager.unobserve(handleChange);
  }, [annotator]);

  return layers;
}
