/**
 * Annota Core - Spatial Indexing
 * R-tree based spatial index for efficient annotation queries
 */

import RBush from 'rbush';
import type { Annotation, Bounds } from './types';
import { calculateBounds } from './types';

/**
 * Spatial index entry wrapping an annotation with its bounds
 */
interface IndexEntry {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  annotation: Annotation;
}

/**
 * Spatial index for annotations using R-tree
 * Provides O(log n) spatial queries
 */
export class SpatialIndex {
  private tree: RBush<IndexEntry>;
  private idMap: Map<string, IndexEntry>;

  constructor() {
    this.tree = new RBush<IndexEntry>();
    this.idMap = new Map();
  }

  /**
   * Insert annotation into spatial index
   */
  insert(annotation: Annotation): void {
    // Remove existing entry if updating
    this.remove(annotation.id);

    const bounds = annotation.shape.bounds || calculateBounds(annotation.shape);
    const entry: IndexEntry = {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      annotation,
    };

    this.tree.insert(entry);
    this.idMap.set(annotation.id, entry);
  }

  /**
   * Remove annotation from spatial index
   */
  remove(id: string): boolean {
    const entry = this.idMap.get(id);
    if (!entry) return false;

    this.tree.remove(entry);
    this.idMap.delete(id);
    return true;
  }

  /**
   * Search for annotations intersecting given bounds
   */
  search(bounds: Bounds): Annotation[] {
    const results = this.tree.search(bounds);
    return results.map(entry => entry.annotation);
  }

  /**
   * Get all annotations in the index
   */
  all(): Annotation[] {
    return Array.from(this.idMap.values()).map((entry: IndexEntry) => entry.annotation);
  }

  /**
   * Clear all entries from index
   */
  clear(): void {
    this.tree.clear();
    this.idMap.clear();
  }

  /**
   * Get annotation by ID (O(1) lookup)
   */
  get(id: string): Annotation | undefined {
    return this.idMap.get(id)?.annotation;
  }

  /**
   * Check if annotation exists in index
   */
  has(id: string): boolean {
    return this.idMap.has(id);
  }

  /**
   * Get number of annotations in index
   */
  size(): number {
    return this.idMap.size;
  }
}

/**
 * Create a new spatial index
 */
export function createSpatialIndex(): SpatialIndex {
  return new SpatialIndex();
}
