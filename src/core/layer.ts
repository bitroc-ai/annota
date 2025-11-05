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
 * Extract unique values for a given property key from a collection of annotations
 * @param annotations Array of annotations to analyze
 * @param propertyKey The property key to extract values from
 * @returns Array of unique values found for the property
 *
 * @example
 * const maskTypes = getPropertyValues(annotations, 'classification');
 * // Returns: ['positive', 'negative']
 *
 * const ageGroups = getPropertyValues(annotations, 'ageGroup');
 * // Returns: ['child', 'youth', 'adult', 'elderly']
 */
export function getPropertyValues(annotations: Annotation[], propertyKey: string): any[] {
  const values = new Set<any>();
  for (const annotation of annotations) {
    const value = annotation.properties?.[propertyKey];
    if (value !== undefined && value !== null) {
      values.add(value);
    }
  }
  return Array.from(values);
}

/**
 * Get a summary of all property keys and their unique values
 * @param annotations Array of annotations to analyze
 * @returns Map of property keys to arrays of unique values
 *
 * @example
 * const propertySummary = getPropertySummary(annotations);
 * // Returns: {
 * //   classification: ['positive', 'negative'],
 * //   gender: ['male', 'female'],
 * //   ageGroup: ['child', 'youth', 'adult', 'elderly']
 * // }
 */
export function getPropertySummary(annotations: Annotation[]): Record<string, any[]> {
  const summary: Record<string, Set<any>> = {};

  for (const annotation of annotations) {
    if (annotation.properties) {
      for (const [key, value] of Object.entries(annotation.properties)) {
        // Skip internal properties (prefixed with _)
        if (key.startsWith('_')) continue;

        if (!summary[key]) {
          summary[key] = new Set();
        }
        if (value !== undefined && value !== null) {
          summary[key].add(value);
        }
      }
    }
  }

  // Convert Sets to Arrays
  const result: Record<string, any[]> = {};
  for (const [key, valueSet] of Object.entries(summary)) {
    result[key] = Array.from(valueSet);
  }
  return result;
}

/**
 * Create a filter for annotations with a specific property value
 * @param propertyKey The property key to filter by
 * @param value The value to match (or array of values for OR matching)
 *
 * @example
 * // Single value filter
 * const positiveFilter = createPropertyFilter('classification', 'positive');
 *
 * // Multiple values filter (OR logic)
 * const youngFilter = createPropertyFilter('ageGroup', ['child', 'youth']);
 */
export function createPropertyFilter(propertyKey: string, value: any | any[]): Filter {
  if (Array.isArray(value)) {
    const valueSet = new Set(value);
    return (annotation: Annotation) => {
      const propValue = annotation.properties?.[propertyKey];
      return propValue !== undefined && valueSet.has(propValue);
    };
  }

  return (annotation: Annotation) => annotation.properties?.[propertyKey] === value;
}

/**
 * Create a filter for positive mask annotations
 * Checks for properties.classification === 'positive'
 * Falls back to polygon/multipolygon/path shapes without classification
 */
export function createPositiveMaskFilter(): Filter {
  return (annotation: Annotation) => {
    const classification = annotation.properties?.classification;

    // If classification is explicitly set to 'positive', include it
    if (classification === 'positive') return true;

    // If classification is not set, default behavior: polygon/path shapes are positive masks
    if (!classification) {
      const shapeType = annotation.shape.type;
      return shapeType === 'polygon' || shapeType === 'multipolygon' || shapeType === 'path';
    }

    return false;
  };
}

/**
 * Create a filter for negative mask annotations
 * Checks for properties.classification === 'negative'
 */
export function createNegativeMaskFilter(): Filter {
  return (annotation: Annotation) => annotation.properties?.classification === 'negative';
}

/**
 * Create a filter based on mask polarity value
 * @param polarity The mask polarity to filter by
 */
export function createMaskPolarityFilter(polarity: 'positive' | 'negative'): Filter {
  return polarity === 'positive' ? createPositiveMaskFilter() : createNegativeMaskFilter();
}

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
