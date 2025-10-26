/**
 * Annota Core - Layer Management
 * Virtual layer system for organizing and controlling annotations
 */

import type { Annotation, Filter } from './types';

// ============================================
// Layer Types
// ============================================

export interface Layer {
  /** Unique layer identifier */
  id: string;
  /** Display name */
  name: string;
  /** Layer visibility */
  visible: boolean;
  /** Prevent editing annotations on this layer */
  locked: boolean;
  /** Layer opacity (0-1) */
  opacity: number;
  /** Rendering order (higher = rendered on top) */
  zIndex: number;
  /** Optional filter function to determine which annotations belong to this layer */
  filter?: Filter;
}

export interface LayerConfig {
  name: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  zIndex?: number;
  filter?: Filter;
}

// ============================================
// Layer Change Events
// ============================================

export interface LayerChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'reordered';
  layers: Layer[];
}

export type LayerObserver = (event: LayerChangeEvent) => void;

// ============================================
// Layer Manager Interface
// ============================================

export interface LayerManager {
  // Layer CRUD
  createLayer(id: string, config: LayerConfig): Layer;
  getLayer(id: string): Layer | undefined;
  getAllLayers(): Layer[];
  updateLayer(id: string, updates: Partial<LayerConfig>): void;
  deleteLayer(id: string): void;

  // Layer visibility & locking
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerLocked(id: string, locked: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerZIndex(id: string, zIndex: number): void;

  // Layer queries
  isLayerVisible(id: string): boolean;
  isLayerLocked(id: string): boolean;
  getLayerForAnnotation(annotation: Annotation): Layer | undefined;
  getVisibleLayers(): Layer[];
  getLayersByZIndex(): Layer[]; // Sorted by zIndex (lowest to highest)

  // Observable
  observe(callback: LayerObserver): void;
  unobserve(callback: LayerObserver): void;
}

// ============================================
// Layer Manager Implementation
// ============================================

class LayerManagerImpl implements LayerManager {
  private layers: Map<string, Layer>;
  private observers: LayerObserver[];

  constructor() {
    this.layers = new Map();
    this.observers = [];

    // Create image layer (background, lowest zIndex)
    this.createLayer('image', {
      name: 'Image',
      visible: true,
      locked: true, // Image layer is locked by default
      opacity: 1,
      zIndex: -1, // Below all annotation layers
    });

    // Create default layer for annotations
    this.createLayer('default', {
      name: 'Default',
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 0,
    });
  }

  private emit(event: LayerChangeEvent): void {
    console.log('[LayerManager] Emitting event:', event.type, 'to', this.observers.length, 'observers');
    this.observers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in layer observer:', error);
      }
    });
  }

  createLayer(id: string, config: LayerConfig): Layer {
    if (this.layers.has(id)) {
      throw new Error(`Layer ${id} already exists`);
    }

    const layer: Layer = {
      id,
      name: config.name,
      visible: config.visible ?? true,
      locked: config.locked ?? false,
      opacity: config.opacity ?? 1,
      zIndex: config.zIndex ?? 0,
      filter: config.filter,
    };

    this.layers.set(id, layer);
    this.emit({ type: 'created', layers: [layer] });

    return layer;
  }

  getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  getAllLayers(): Layer[] {
    return Array.from(this.layers.values());
  }

  updateLayer(id: string, updates: Partial<LayerConfig>): void {
    const layer = this.layers.get(id);
    if (!layer) {
      console.warn(`Layer ${id} does not exist, cannot update`);
      return;
    }

    const updatedLayer: Layer = {
      ...layer,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.visible !== undefined && { visible: updates.visible }),
      ...(updates.locked !== undefined && { locked: updates.locked }),
      ...(updates.opacity !== undefined && { opacity: updates.opacity }),
      ...(updates.zIndex !== undefined && { zIndex: updates.zIndex }),
      ...(updates.filter !== undefined && { filter: updates.filter }),
    };

    this.layers.set(id, updatedLayer);
    this.emit({ type: 'updated', layers: [updatedLayer] });
  }

  deleteLayer(id: string): void {
    if (id === 'default' || id === 'image') {
      console.warn(`Cannot delete ${id} layer`);
      return;
    }

    const layer = this.layers.get(id);
    if (!layer) {
      console.warn(`Layer ${id} does not exist, cannot delete`);
      return;
    }

    this.layers.delete(id);
    this.emit({ type: 'deleted', layers: [layer] });
  }

  setLayerVisibility(id: string, visible: boolean): void {
    console.log('[LayerManager] Setting layer visibility:', id, visible);
    this.updateLayer(id, { visible });
  }

  setLayerLocked(id: string, locked: boolean): void {
    this.updateLayer(id, { locked });
  }

  setLayerOpacity(id: string, opacity: number): void {
    this.updateLayer(id, { opacity: Math.max(0, Math.min(1, opacity)) });
  }

  setLayerZIndex(id: string, zIndex: number): void {
    this.updateLayer(id, { zIndex });
  }

  isLayerVisible(id: string): boolean {
    const layer = this.layers.get(id);
    return layer?.visible ?? true;
  }

  isLayerLocked(id: string): boolean {
    const layer = this.layers.get(id);
    return layer?.locked ?? false;
  }

  getLayerForAnnotation(annotation: Annotation): Layer | undefined {
    // First check if annotation has explicit layer property
    const layerId = annotation.properties?.layer;
    if (layerId && typeof layerId === 'string') {
      const layer = this.layers.get(layerId);
      if (layer) return layer;
    }

    // Then check if any layer's filter matches this annotation
    for (const layer of this.layers.values()) {
      if (layer.filter && layer.filter(annotation)) {
        return layer;
      }
    }

    // Default to 'default' layer
    return this.layers.get('default');
  }

  getVisibleLayers(): Layer[] {
    return Array.from(this.layers.values()).filter(layer => layer.visible);
  }

  getLayersByZIndex(): Layer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  observe(callback: LayerObserver): void {
    if (!this.observers.includes(callback)) {
      this.observers.push(callback);
    }
  }

  unobserve(callback: LayerObserver): void {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new layer manager
 */
export function createLayerManager(): LayerManager {
  return new LayerManagerImpl();
}

// ============================================
// Layer Utility Functions
// ============================================

/**
 * Check if an annotation should be rendered based on its layer visibility
 */
export function isAnnotationVisible(annotation: Annotation, layerManager: LayerManager): boolean {
  const layer = layerManager.getLayerForAnnotation(annotation);
  return layer?.visible ?? true;
}

/**
 * Check if an annotation can be edited based on its layer lock state
 */
export function isAnnotationEditable(annotation: Annotation, layerManager: LayerManager): boolean {
  const layer = layerManager.getLayerForAnnotation(annotation);
  return !(layer?.locked ?? false);
}

/**
 * Get the effective opacity for an annotation (combines annotation style and layer opacity)
 */
export function getEffectiveOpacity(annotation: Annotation, layerManager: LayerManager): number {
  const layer = layerManager.getLayerForAnnotation(annotation);
  const layerOpacity = layer?.opacity ?? 1;
  const annotationOpacity = annotation.style?.fillOpacity ?? 1;
  return layerOpacity * annotationOpacity;
}
