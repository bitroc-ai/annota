import type {
  Annotation,
  AnnotationProperties,
  AnnotationSource,
  Bounds,
  Filter,
} from './types';
import { containsPoint } from './types';
import { AnnotationExistsError, AnnotationNotFoundError, AnnotationValidationError } from './errors';
import { cloneAnnotation, normalizeAnnotation } from './normalization';
import { createSpatialIndex, type SpatialIndex } from './spatial';

export interface StoreChangeEvent {
  created: Annotation[];
  updated: Array<{ oldValue: Annotation; newValue: Annotation }>;
  deleted: Annotation[];
}

export type StoreObserver = (event: StoreChangeEvent) => void;
export type StoreWriteMode = 'insert' | 'upsert';
export interface StoreAddAllOptions {
  mode?: StoreWriteMode;
}

export interface AnnotationStore {
  add<P extends AnnotationProperties>(annotation: AnnotationSource<P>): void;
  addAll<P extends AnnotationProperties>(
    annotations: readonly AnnotationSource<P>[],
    options?: StoreAddAllOptions | boolean
  ): void;
  replaceAll<P extends AnnotationProperties>(annotations: readonly AnnotationSource<P>[]): void;
  get(id: string): Annotation | undefined;
  update<P extends AnnotationProperties>(id: string, annotation: AnnotationSource<P>): void;
  delete(id: string): void;
  clear(): void;
  all(): Annotation[];
  getAt(x: number, y: number, filter?: Filter, buffer?: number): Annotation | undefined;
  search(bounds: Bounds, filter?: Filter): Annotation[];
  /** @deprecated Since 0.11.0. Use search(); this is a bounds candidate query. */
  getIntersecting(bounds: Bounds, filter?: Filter): Annotation[];
  observe(callback: StoreObserver): void;
  unobserve(callback: StoreObserver): void;
}

class AnnotationStoreImpl implements AnnotationStore {
  private index = new Map<string, Annotation>();
  private spatialIndex: SpatialIndex = createSpatialIndex();
  private observers = new Set<StoreObserver>();

  private emit(event: StoreChangeEvent): void {
    if (event.created.length === 0 && event.updated.length === 0 && event.deleted.length === 0) {
      return;
    }
    const snapshot: StoreChangeEvent = {
      created: event.created.map(cloneAnnotation),
      updated: event.updated.map(({ oldValue, newValue }) => ({
        oldValue: cloneAnnotation(oldValue),
        newValue: cloneAnnotation(newValue),
      })),
      deleted: event.deleted.map(cloneAnnotation),
    };
    this.observers.forEach(callback => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('Error in store observer:', error);
      }
    });
  }

  add<P extends AnnotationProperties>(input: AnnotationSource<P>): void {
    this.addAll([input], { mode: 'insert' });
  }

  addAll<P extends AnnotationProperties>(
    inputs: readonly AnnotationSource<P>[],
    options: StoreAddAllOptions | boolean = {}
  ): void {
    if (typeof options === 'boolean') {
      if (options) {
        this.replaceAll(inputs);
        return;
      }
      // Compatibility: the old `false` signature behaved like an upsert.
      this.writeAll(inputs, 'upsert');
      return;
    }
    this.writeAll(inputs, options.mode ?? 'insert');
  }

  private writeAll<P extends AnnotationProperties>(
    inputs: readonly AnnotationSource<P>[],
    mode: StoreWriteMode
  ): void {
    const normalized = inputs.map(input => normalizeAnnotation(input));
    this.assertUniqueBatch(normalized);
    if (mode === 'insert') {
      const conflict = normalized.find(annotation => this.index.has(annotation.id));
      if (conflict) throw new AnnotationExistsError(conflict.id);
    }

    const created: Annotation[] = [];
    const updated: Array<{ oldValue: Annotation; newValue: Annotation }> = [];
    const nextIndex = new Map(this.index);
    for (const annotation of normalized) {
      const previous = nextIndex.get(annotation.id);
      nextIndex.set(annotation.id, annotation);
      if (previous) updated.push({ oldValue: previous, newValue: annotation });
      else created.push(annotation);
    }

    this.commit(nextIndex);
    this.emit({ created, updated, deleted: [] });
  }

  replaceAll<P extends AnnotationProperties>(inputs: readonly AnnotationSource<P>[]): void {
    const normalized = inputs.map(input => normalizeAnnotation(input));
    this.assertUniqueBatch(normalized);

    const nextIndex = new Map<string, Annotation>();
    normalized.forEach(annotation => nextIndex.set(annotation.id, annotation));

    const created: Annotation[] = [];
    const updated: Array<{ oldValue: Annotation; newValue: Annotation }> = [];
    const deleted: Annotation[] = [];

    for (const annotation of normalized) {
      const previous = this.index.get(annotation.id);
      if (previous) updated.push({ oldValue: previous, newValue: annotation });
      else created.push(annotation);
    }
    for (const previous of this.index.values()) {
      if (!nextIndex.has(previous.id)) deleted.push(previous);
    }

    this.commit(nextIndex);
    this.emit({ created, updated, deleted });
  }

  private assertUniqueBatch(annotations: readonly Annotation[]): void {
    const ids = new Set<string>();
    for (const annotation of annotations) {
      if (ids.has(annotation.id)) {
        throw new AnnotationValidationError(
          `Duplicate annotation id ${annotation.id} in the same batch`
        );
      }
      ids.add(annotation.id);
    }
  }

  private commit(nextIndex: Map<string, Annotation>): void {
    const nextSpatial = createSpatialIndex();
    nextIndex.forEach(annotation => nextSpatial.insert(annotation));
    this.index = nextIndex;
    this.spatialIndex = nextSpatial;
  }

  get(id: string): Annotation | undefined {
    const annotation = this.index.get(id);
    return annotation ? cloneAnnotation(annotation) : undefined;
  }

  update<P extends AnnotationProperties>(id: string, input: AnnotationSource<P>): void {
    const oldValue = this.index.get(id);
    if (!oldValue) throw new AnnotationNotFoundError(id);
    if (input.id !== id) {
      throw new AnnotationValidationError('Cannot change annotation ID during update');
    }
    const newValue = normalizeAnnotation(input);
    this.index.set(id, newValue);
    this.spatialIndex.insert(newValue);
    this.emit({ created: [], updated: [{ oldValue, newValue }], deleted: [] });
  }

  delete(id: string): void {
    const annotation = this.index.get(id);
    if (!annotation) return;
    this.index.delete(id);
    this.spatialIndex.remove(id);
    this.emit({ created: [], updated: [], deleted: [annotation] });
  }

  clear(): void {
    const deleted = Array.from(this.index.values());
    if (deleted.length === 0) return;
    this.index = new Map();
    this.spatialIndex = createSpatialIndex();
    this.emit({ created: [], updated: [], deleted });
  }

  all(): Annotation[] {
    return Array.from(this.index.values(), cloneAnnotation);
  }

  getAt(x: number, y: number, filter?: Filter, buffer = 0): Annotation | undefined {
    const candidates = this.spatialIndex.search({
      minX: x - buffer,
      minY: y - buffer,
      maxX: x + buffer,
      maxY: y + buffer,
    });
    for (const annotation of candidates) {
      if (filter && !filter(annotation)) continue;
      if (containsPoint(annotation.shape, x, y, buffer)) return cloneAnnotation(annotation);
    }
    return undefined;
  }

  search(bounds: Bounds, filter?: Filter): Annotation[] {
    const candidates = this.spatialIndex.search(bounds);
    return (filter ? candidates.filter(filter) : candidates).map(cloneAnnotation);
  }

  getIntersecting(bounds: Bounds, filter?: Filter): Annotation[] {
    return this.search(bounds, filter);
  }

  observe(callback: StoreObserver): void {
    this.observers.add(callback);
  }

  unobserve(callback: StoreObserver): void {
    this.observers.delete(callback);
  }
}

export function createAnnotationStore(): AnnotationStore {
  return new AnnotationStoreImpl();
}
