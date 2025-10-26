/**
 * Hook for managing layers
 *
 * @example
 * ```tsx
 * function LayerPanel() {
 *   const layerManager = useLayerManager();
 *
 *   return (
 *     <div>
 *       {layerManager.layers.map(layer => (
 *         <div key={layer.id}>
 *           <input
 *             type="checkbox"
 *             checked={layer.visible}
 *             onChange={(e) => layerManager.setLayerVisibility(layer.id, e.target.checked)}
 *           />
 *           <span>{layer.name}</span>
 *           <input
 *             type="range"
 *             min="0"
 *             max="1"
 *             step="0.1"
 *             value={layer.opacity}
 *             onChange={(e) => layerManager.setLayerOpacity(layer.id, parseFloat(e.target.value))}
 *           />
 *         </div>
 *       ))}
 *       <button onClick={() => layerManager.createLayer('my-layer', { name: 'My Layer' })}>
 *         Add Layer
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback } from 'react';
import { useAnnotator } from '../Provider';
import { useLayers } from './useLayers';
import type { Layer, LayerConfig } from '../../core/layer';

/**
 * Result of useLayerManager hook
 */
export interface UseLayerManagerResult {
  /** All layers */
  layers: Layer[];

  /** Create a new layer */
  createLayer: (id: string, config: LayerConfig) => Layer | undefined;

  /** Get a specific layer */
  getLayer: (id: string) => Layer | undefined;

  /** Update a layer */
  updateLayer: (id: string, updates: Partial<LayerConfig>) => void;

  /** Delete a layer */
  deleteLayer: (id: string) => void;

  /** Set layer visibility */
  setLayerVisibility: (id: string, visible: boolean) => void;

  /** Set layer locked state */
  setLayerLocked: (id: string, locked: boolean) => void;

  /** Set layer opacity */
  setLayerOpacity: (id: string, opacity: number) => void;

  /** Set layer z-index */
  setLayerZIndex: (id: string, zIndex: number) => void;

  /** Get layers sorted by z-index */
  getLayersByZIndex: () => Layer[];
}

export function useLayerManager(): UseLayerManagerResult {
  const annotator = useAnnotator();
  const layers = useLayers();

  const createLayer = useCallback(
    (id: string, config: LayerConfig) => {
      if (!annotator) return;
      return annotator.createLayer(id, config);
    },
    [annotator]
  );

  const getLayer = useCallback(
    (id: string) => {
      if (!annotator) return;
      return annotator.getLayer(id);
    },
    [annotator]
  );

  const updateLayer = useCallback(
    (id: string, updates: Partial<LayerConfig>) => {
      if (!annotator) return;
      annotator.updateLayer(id, updates);
    },
    [annotator]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      if (!annotator) return;
      annotator.deleteLayer(id);
    },
    [annotator]
  );

  const setLayerVisibility = useCallback(
    (id: string, visible: boolean) => {
      if (!annotator) return;
      annotator.setLayerVisibility(id, visible);
    },
    [annotator]
  );

  const setLayerLocked = useCallback(
    (id: string, locked: boolean) => {
      if (!annotator) return;
      annotator.setLayerLocked(id, locked);
    },
    [annotator]
  );

  const setLayerOpacity = useCallback(
    (id: string, opacity: number) => {
      if (!annotator) return;
      annotator.setLayerOpacity(id, opacity);
    },
    [annotator]
  );

  const setLayerZIndex = useCallback(
    (id: string, zIndex: number) => {
      if (!annotator) return;
      annotator.setLayerZIndex(id, zIndex);
    },
    [annotator]
  );

  const getLayersByZIndex = useCallback(() => {
    if (!annotator) return [];
    return annotator.state.layerManager.getLayersByZIndex();
  }, [annotator]);

  return {
    layers,
    createLayer,
    getLayer,
    updateLayer,
    deleteLayer,
    setLayerVisibility,
    setLayerLocked,
    setLayerOpacity,
    setLayerZIndex,
    getLayersByZIndex,
  };
}
