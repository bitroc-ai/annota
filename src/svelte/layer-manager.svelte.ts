/**
 * Function for managing layers
 */

import { getAnnotator } from './annotator';
import { layers } from './layers.svelte';
import type { Layer, LayerConfig } from 'annota';

/**
 * Result of layerManager function
 */
export interface LayerManagerResult {
  /** All layers */
  layers: readonly Layer[];

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
  getLayersByZIndex: () => readonly Layer[];
}

export function layerManager(): LayerManagerResult {
  const getAnnotatorFn = getAnnotator();
  const getLayersList = layers();

  function createLayer(id: string, config: LayerConfig): Layer | undefined {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    return annotator.createLayer(id, config);
  }

  function getLayer(id: string): Layer | undefined {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    return annotator.getLayer(id);
  }

  function updateLayer(id: string, updates: Partial<LayerConfig>): void {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.updateLayer(id, updates);
  }

  function deleteLayer(id: string): void {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.deleteLayer(id);
  }

  function setLayerVisibility(id: string, visible: boolean): void {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.setLayerVisibility(id, visible);
  }

  function setLayerLocked(id: string, locked: boolean): void {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.setLayerLocked(id, locked);
  }

  function setLayerOpacity(id: string, opacity: number): void {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.setLayerOpacity(id, opacity);
  }

  function setLayerZIndex(id: string, zIndex: number): void {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.setLayerZIndex(id, zIndex);
  }

  function getLayersByZIndex(): readonly Layer[] {
    const annotator = getAnnotatorFn();
    if (!annotator) return [];
    return annotator.unsafeState.layerManager.getLayersByZIndex();
  }

  return {
    get layers() { return getLayersList(); },
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
