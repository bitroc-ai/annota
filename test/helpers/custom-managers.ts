import type {
  AnnotationStore,
  StoreAddAllOptions,
  StoreChangeEvent,
  StoreObserver,
  StoreWriteMode,
} from '../../src/core/store';
import type {
  Annotation,
  AnnotationInput,
  AnnotationProperties,
  Bounds,
  Filter,
} from '../../src/core/types';
import { containsPoint } from '../../src/core/types';
import { cloneAnnotation, normalizeAnnotation } from '../../src/core/normalization';
import {
  AnnotationExistsError,
  AnnotationNotFoundError,
  AnnotationValidationError,
} from '../../src/core/errors';
import type {
  Layer,
  LayerChangeEvent,
  LayerConfig,
  LayerManager,
  LayerObserver,
} from '../../src/core/layer';
import type {
  SelectionChangeEvent,
  SelectionManager,
  SelectionObserver,
} from '../../src/core/selection';
import type {
  Command,
  HistoryManager,
  HistoryManagerOptions,
  HistoryObserver,
  HistoryStateEvent,
} from '../../src/core/history';

export class MemoryAnnotationStore implements AnnotationStore {
  private readonly values = new Map<string, Annotation>();
  private readonly observers = new Set<StoreObserver>();

  private emit(event: StoreChangeEvent): void {
    if (event.created.length || event.updated.length || event.deleted.length) {
      const snapshot: StoreChangeEvent = {
        created: event.created.map(cloneAnnotation),
        updated: event.updated.map(({ oldValue, newValue }) => ({
          oldValue: cloneAnnotation(oldValue),
          newValue: cloneAnnotation(newValue),
        })),
        deleted: event.deleted.map(cloneAnnotation),
      };
      this.observers.forEach(observer => {
        try {
          observer(snapshot);
        } catch (error) {
          console.error('Error in store observer:', error);
        }
      });
    }
  }

  private assertUniqueBatch(annotations: readonly Annotation[]): void {
    const ids = new Set<string>();
    annotations.forEach(annotation => {
      if (ids.has(annotation.id)) {
        throw new AnnotationValidationError(
          `Duplicate annotation id ${annotation.id} in the same batch`
        );
      }
      ids.add(annotation.id);
    });
  }

  private writeAll<P extends AnnotationProperties>(
    inputs: readonly AnnotationInput<P>[],
    mode: StoreWriteMode
  ): void {
    const normalized = inputs.map(input => normalizeAnnotation(input));
    this.assertUniqueBatch(normalized);
    const conflict = mode === 'insert'
      ? normalized.find(annotation => this.values.has(annotation.id))
      : undefined;
    if (conflict) throw new AnnotationExistsError(conflict.id);
    const created: Annotation[] = [];
    const updated: Array<{ oldValue: Annotation; newValue: Annotation }> = [];
    normalized.forEach(annotation => {
      const previous = this.values.get(annotation.id);
      this.values.set(annotation.id, annotation);
      if (previous) updated.push({ oldValue: previous, newValue: annotation });
      else created.push(annotation);
    });
    this.emit({ created, updated, deleted: [] });
  }

  add<P extends AnnotationProperties>(annotation: AnnotationInput<P>): void {
    this.writeAll([annotation], 'insert');
  }

  addAll<P extends AnnotationProperties>(
    annotations: readonly AnnotationInput<P>[],
    options: StoreAddAllOptions | boolean = {}
  ): void {
    if (options === true) {
      this.replaceAll(annotations);
      return;
    }
    this.writeAll(annotations, options === false ? 'upsert' : options.mode ?? 'insert');
  }

  replaceAll<P extends AnnotationProperties>(inputs: readonly AnnotationInput<P>[]): void {
    const normalized = inputs.map(input => normalizeAnnotation(input));
    this.assertUniqueBatch(normalized);
    const previous = new Map(this.values);
    this.values.clear();
    normalized.forEach(annotation => this.values.set(annotation.id, annotation));
    const created = normalized.filter(annotation => !previous.has(annotation.id));
    const updated = normalized
      .filter(annotation => previous.has(annotation.id))
      .map(annotation => ({
        oldValue: previous.get(annotation.id)!,
        newValue: annotation,
      }));
    const deleted = [...previous.values()].filter(annotation => !this.values.has(annotation.id));
    this.emit({ created, updated, deleted });
  }

  get(id: string): Annotation | undefined {
    const annotation = this.values.get(id);
    return annotation ? cloneAnnotation(annotation) : undefined;
  }

  update<P extends AnnotationProperties>(id: string, input: AnnotationInput<P>): void {
    const previous = this.values.get(id);
    if (!previous) throw new AnnotationNotFoundError(id);
    if (input.id !== id) {
      throw new AnnotationValidationError('Cannot change annotation ID during update');
    }
    const annotation = normalizeAnnotation(input);
    this.values.set(id, annotation);
    this.emit({ created: [], updated: [{ oldValue: previous, newValue: annotation }], deleted: [] });
  }

  delete(id: string): void {
    const annotation = this.values.get(id);
    if (!annotation) return;
    this.values.delete(id);
    this.emit({ created: [], updated: [], deleted: [annotation] });
  }

  clear(): void {
    const deleted = [...this.values.values()];
    this.values.clear();
    this.emit({ created: [], updated: [], deleted });
  }

  all(): Annotation[] {
    return [...this.values.values()].map(cloneAnnotation);
  }

  getAt(x: number, y: number, filter?: Filter, buffer = 0): Annotation | undefined {
    return this.all().find(annotation =>
      (!filter || filter(annotation)) && containsPoint(annotation.shape, x, y, buffer)
    );
  }

  search(bounds: Bounds, filter?: Filter): Annotation[] {
    return this.all().filter(annotation => {
      const candidate = annotation.shape.bounds;
      return (
        (!filter || filter(annotation)) &&
        candidate.minX <= bounds.maxX &&
        candidate.maxX >= bounds.minX &&
        candidate.minY <= bounds.maxY &&
        candidate.maxY >= bounds.minY
      );
    });
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

function memoryLayerSnapshot(layer: Layer): Layer {
  return Object.freeze({ ...layer });
}

function memoryLayerSnapshots(layers: Iterable<Layer>): readonly Layer[] {
  return Object.freeze(Array.from(layers, memoryLayerSnapshot));
}

export class MemoryLayerManager implements LayerManager {
  private readonly layers = new Map<string, Layer>();
  private readonly observers = new Set<LayerObserver>();

  constructor() {
    this.layers.set('image', {
      id: 'image', name: 'Image', visible: true, locked: true, opacity: 1, zIndex: -1,
    });
    this.layers.set('default', {
      id: 'default', name: 'Default', visible: true, locked: false, opacity: 1, zIndex: 0,
    });
  }

  private emit(type: LayerChangeEvent['type'], layer: Layer): void {
    const event: LayerChangeEvent = Object.freeze({
      type,
      layers: memoryLayerSnapshots([layer]),
    });
    this.observers.forEach(observer => {
      try {
        observer(event);
      } catch (error) {
        console.error('Error in layer observer:', error);
      }
    });
  }

  createLayer(id: string, config: LayerConfig): Layer {
    if (this.layers.has(id)) throw new Error(`Layer ${id} already exists`);
    const layer = {
      id,
      name: config.name ?? id,
      visible: config.visible ?? true,
      locked: config.locked ?? false,
      opacity: Math.max(0, Math.min(1, config.opacity ?? 1)),
      zIndex: config.zIndex ?? 0,
      filter: config.filter,
    };
    this.layers.set(id, layer);
    this.emit('created', layer);
    return memoryLayerSnapshot(layer);
  }

  getLayer(id: string): Layer | undefined {
    const layer = this.layers.get(id);
    return layer ? memoryLayerSnapshot(layer) : undefined;
  }

  getAllLayers(): readonly Layer[] {
    return memoryLayerSnapshots(this.layers.values());
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
      ...(updates.opacity !== undefined && {
        opacity: Math.max(0, Math.min(1, updates.opacity)),
      }),
      ...(updates.zIndex !== undefined && { zIndex: updates.zIndex }),
      ...(updates.filter !== undefined && { filter: updates.filter }),
    };
    this.layers.set(id, updatedLayer);
    this.emit(updates.zIndex === undefined ? 'updated' : 'reordered', updatedLayer);
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
    this.emit('deleted', layer);
  }

  setLayerVisibility(id: string, visible: boolean): void {
    this.updateLayer(id, { visible });
  }

  setLayerLocked(id: string, locked: boolean): void {
    this.updateLayer(id, { locked });
  }

  setLayerOpacity(id: string, opacity: number): void {
    this.updateLayer(id, { opacity });
  }

  setLayerZIndex(id: string, zIndex: number): void {
    this.updateLayer(id, { zIndex });
  }

  isLayerVisible(id: string): boolean {
    return this.layers.get(id)?.visible ?? true;
  }

  isLayerLocked(id: string): boolean {
    return this.layers.get(id)?.locked ?? false;
  }

  getLayerForAnnotation(annotation: Annotation): Layer | undefined {
    const explicit = annotation.layerId ?? annotation.properties.layer;
    if (typeof explicit === 'string' && this.layers.has(explicit)) return this.getLayer(explicit);
    const filtered = [...this.layers.values()].find(layer => layer.filter?.(annotation));
    return filtered ? memoryLayerSnapshot(filtered) : this.getLayer('default');
  }

  getVisibleLayers(): readonly Layer[] {
    return memoryLayerSnapshots(
      [...this.layers.values()].filter(layer => layer.visible)
    );
  }

  getLayersByZIndex(): readonly Layer[] {
    return memoryLayerSnapshots(
      [...this.layers.values()].sort((left, right) => left.zIndex - right.zIndex)
    );
  }

  observe(callback: LayerObserver): void {
    this.observers.add(callback);
  }

  unobserve(callback: LayerObserver): void {
    this.observers.delete(callback);
  }
}

export class MemorySelectionManager implements SelectionManager {
  private selected = new Set<string>();
  private readonly observers = new Set<SelectionObserver>();

  private replace(ids: readonly string[]): void {
    const previous = this.getSelected();
    const current = [...new Set(ids)];
    const previousSet = new Set(previous);
    const changed = previous.length !== current.length ||
      !current.every(id => previousSet.has(id));
    if (changed) {
      this.selected = new Set(current);
      const event: SelectionChangeEvent = { previous, current };
      this.observers.forEach(observer => {
        try {
          observer(event);
        } catch (error) {
          console.error('Error in selection observer:', error);
        }
      });
    }
  }

  select(ids: string | string[]): void {
    this.replace(Array.isArray(ids) ? ids : [ids]);
  }

  toggle(id: string): void {
    const next = this.getSelected();
    const index = next.indexOf(id);
    if (index >= 0) next.splice(index, 1);
    else next.push(id);
    this.replace(next);
  }

  add(ids: string | string[]): void {
    this.replace([...this.selected, ...(Array.isArray(ids) ? ids : [ids])]);
  }

  remove(ids: string | string[]): void {
    const removed = new Set(Array.isArray(ids) ? ids : [ids]);
    this.replace(this.getSelected().filter(id => !removed.has(id)));
  }

  clear(): void {
    this.replace([]);
  }

  getSelected(): string[] {
    return [...this.selected];
  }

  isSelected(id: string): boolean {
    return this.selected.has(id);
  }

  hasSelection(): boolean {
    return this.selected.size > 0;
  }

  getSelectionCount(): number {
    return this.selected.size;
  }

  observe(callback: SelectionObserver): void {
    this.observers.add(callback);
  }

  unobserve(callback: SelectionObserver): void {
    this.observers.delete(callback);
  }
}

class MemoryBatchCommand implements Command {
  constructor(private readonly commands: Command[]) {}
  execute(): void {
    this.commands.forEach(command => command.execute());
  }
  undo(): void {
    [...this.commands].reverse().forEach(command => command.undo());
  }
  redo(): void {
    this.commands.forEach(command => command.redo());
  }
}

export class MemoryHistoryManager implements HistoryManager {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly observers = new Set<HistoryObserver>();
  private batch: Command[] | null = null;
  private enabled = true;
  private readonly maxHistorySize: number;
  private readonly enableMerging: boolean;

  constructor(options: HistoryManagerOptions = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.enableMerging = options.enableMerging ?? true;
  }

  private emit(): void {
    const event: HistoryStateEvent = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoSize: this.getUndoSize(),
      redoSize: this.getRedoSize(),
    };
    this.observers.forEach(observer => {
      try {
        observer(event);
      } catch (error) {
        console.error('Error in history observer:', error);
      }
    });
  }

  execute(command: Command): void {
    if (!this.enabled) {
      command.execute();
      return;
    }
    if (this.batch) {
      command.execute();
      this.batch.push(command);
      return;
    }
    command.execute();
    if (this.enableMerging && this.undoStack.length) {
      const previous = this.undoStack[this.undoStack.length - 1];
      if (previous.merge?.(command)) {
        this.redoStack.length = 0;
        this.emit();
        return;
      }
    }
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistorySize) this.undoStack.shift();
    this.redoStack.length = 0;
    this.emit();
  }

  undo(): void {
    const command = this.undoStack[this.undoStack.length - 1];
    if (!command) return;
    const wasEnabled = this.enabled;
    this.enabled = false;
    try {
      command.undo();
      this.undoStack.pop();
      this.redoStack.push(command);
      this.emit();
    } finally {
      this.enabled = wasEnabled;
    }
  }

  redo(): void {
    const command = this.redoStack[this.redoStack.length - 1];
    if (!command) return;
    const wasEnabled = this.enabled;
    this.enabled = false;
    try {
      command.redo();
      this.redoStack.pop();
      this.undoStack.push(command);
      this.emit();
    } finally {
      this.enabled = wasEnabled;
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.emit();
  }

  getUndoSize(): number {
    return this.undoStack.length;
  }

  getRedoSize(): number {
    return this.redoStack.length;
  }

  beginBatch(_description?: string): void {
    this.batch = [];
  }

  endBatch(): void {
    if (!this.batch) return;
    if (this.batch.length) {
      this.undoStack.push(new MemoryBatchCommand(this.batch));
      if (this.undoStack.length > this.maxHistorySize) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    this.batch = null;
    this.emit();
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  observe(callback: HistoryObserver): void {
    this.observers.add(callback);
  }

  unobserve(callback: HistoryObserver): void {
    this.observers.delete(callback);
  }
}
