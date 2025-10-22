/**
 * Annota Core - Annotation Store
 * Observable store for annotation state management
 */

import type { Annotation, Bounds, Filter } from './types';
import { containsPoint } from './types';
import { createSpatialIndex, type SpatialIndex } from './spatial';

// ============================================
// Store Events
// ============================================

export interface StoreChangeEvent {
  created: Annotation[];
  updated: Array<{ oldValue: Annotation; newValue: Annotation }>;
  deleted: Annotation[];
}

export type StoreObserver = (event: StoreChangeEvent) => void;

// ============================================
// Annotation Store Interface
// ============================================

export interface AnnotationStore {
  // CRUD operations
  add(annotation: Annotation): void;
  addAll(annotations: Annotation[], replace?: boolean): void;
  get(id: string): Annotation | undefined;
  update(id: string, annotation: Annotation): void;
  delete(id: string): void;
  clear(): void;
  all(): Annotation[];

  // Spatial queries
  getAt(x: number, y: number, filter?: Filter, buffer?: number): Annotation | undefined;
  getIntersecting(bounds: Bounds, filter?: Filter): Annotation[];

  // Observable
  observe(callback: StoreObserver): void;
  unobserve(callback: StoreObserver): void;
}

// ============================================
// Store Implementation
// ============================================

class AnnotationStoreImpl implements AnnotationStore {
  private index: Map<string, Annotation>;
  private spatialIndex: SpatialIndex;
  private observers: StoreObserver[];

  constructor() {
    this.index = new Map();
    this.spatialIndex = createSpatialIndex();
    this.observers = [];
  }

  private emit(event: StoreChangeEvent): void {
    if (event.created.length === 0 && event.updated.length === 0 && event.deleted.length === 0) {
      return; // No changes, don't notify
    }

    this.observers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in store observer:', error);
      }
    });
  }

  add(annotation: Annotation): void {
    if (this.index.has(annotation.id)) {
      throw new Error(`Annotation ${annotation.id} already exists`);
    }

    this.index.set(annotation.id, annotation);
    this.spatialIndex.insert(annotation);
    this.emit({ created: [annotation], updated: [], deleted: [] });
  }

  addAll(annotations: Annotation[], replace = false): void {
    const deleted: Annotation[] = [];

    if (replace) {
      // Collect existing annotations before clearing
      deleted.push(...Array.from(this.index.values()));
      this.index.clear();
      this.spatialIndex.clear();
    }

    // Add all new annotations
    annotations.forEach(annotation => {
      this.index.set(annotation.id, annotation);
      this.spatialIndex.insert(annotation);
    });

    this.emit({
      created: annotations,
      updated: [],
      deleted,
    });
  }

  get(id: string): Annotation | undefined {
    return this.index.get(id);
  }

  update(id: string, annotation: Annotation): void {
    const oldValue = this.index.get(id);
    if (!oldValue) {
      console.warn(`Annotation ${id} does not exist, cannot update`);
      return;
    }

    if (annotation.id !== id) {
      throw new Error('Cannot change annotation ID during update');
    }

    this.index.set(id, annotation);
    this.spatialIndex.insert(annotation); // Will remove old entry first

    this.emit({
      created: [],
      updated: [{ oldValue, newValue: annotation }],
      deleted: [],
    });
  }

  delete(id: string): void {
    const annotation = this.index.get(id);
    if (!annotation) {
      console.warn(`Annotation ${id} does not exist, cannot delete`);
      return;
    }

    this.index.delete(id);
    this.spatialIndex.remove(id);

    this.emit({
      created: [],
      updated: [],
      deleted: [annotation],
    });
  }

  clear(): void {
    const deleted = Array.from(this.index.values());

    this.index.clear();
    this.spatialIndex.clear();

    this.emit({
      created: [],
      updated: [],
      deleted,
    });
  }

  all(): Annotation[] {
    return Array.from(this.index.values());
  }

  getAt(x: number, y: number, filter?: Filter, buffer = 0): Annotation | undefined {
    // Search in a small box around the point
    const searchBounds: Bounds = {
      minX: x - buffer,
      minY: y - buffer,
      maxX: x + buffer,
      maxY: y + buffer,
    };

    const candidates = this.spatialIndex.search(searchBounds);

    // Test each candidate for actual containment
    for (const annotation of candidates) {
      if (filter && !filter(annotation)) continue;

      if (containsPoint(annotation.shape, x, y, buffer)) {
        return annotation;
      }
    }

    return undefined;
  }

  getIntersecting(bounds: Bounds, filter?: Filter): Annotation[] {
    const candidates = this.spatialIndex.search(bounds);
    return filter ? candidates.filter(filter) : candidates;
  }

  observe(callback: StoreObserver): void {
    if (!this.observers.includes(callback)) {
      this.observers.push(callback);
    }
  }

  unobserve(callback: StoreObserver): void {
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
 * Create a new annotation store
 */
export function createAnnotationStore(): AnnotationStore {
  return new AnnotationStoreImpl();
}
