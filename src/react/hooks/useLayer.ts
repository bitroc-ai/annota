/**
 * Hook to get a specific layer by ID
 */

import { useEffect, useState } from 'react';
import { useAnnotator } from '../Provider';
import type { Layer } from '../../core/layer';

export function useLayer(id: string): Layer | undefined {
  const annotator = useAnnotator();
  const [layer, setLayer] = useState<Layer | undefined>();

  useEffect(() => {
    if (!annotator) return;

    const layerManager = annotator.state.layerManager;
    if (!layerManager) return;

    const handleChange = () => {
      setLayer(layerManager.getLayer(id));
    };

    // Initial load
    handleChange();

    layerManager.observe(handleChange);
    return () => layerManager.unobserve(handleChange);
  }, [annotator, id]);

  return layer;
}
