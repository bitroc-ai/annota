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
  HistoryObserver,
  HistoryStateEvent,
} from '../../src/core/history';

export class MemoryAnnotationStore implements AnnotationStore {
  private readonly values = new Map<string, Annotation>();
  private readonly observers = new Set<StoreObserver>();

  private emit(event: StoreChangeEvent): void {
    if (event.created.length || event.updated.length || event.deleted.length) {
      this.observers.forEach(observer => observer(event));
    }
  }

  private writeAll<P extends AnnotationProperties>(
    inputs: readonly AnnotationInput<P>[],
    mode: StoreWriteMode
  ): void {
    const normalized = inputs.map(input => normalizeAnnotation(input));
    if (new Set(normalized.map(annotation => annotation.id)).size !== normalized.length) {
      throw new Error('Duplicate annotation ID in batch');
    }
    if (mode === 'insert' && normalized.some(annotation => this.values.has(annotation.id))) {
      throw new Error('Annotation already exists');
    }
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
    if (!previous) throw new Error(`Annotation ${id} does not exist`);
    const annotation = normalizeAnnotation({ ...input, id });
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
      (!filter || filter(annotation)) && containsPoint(annotation.shape, { x, y }, buffer)
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
    const event = { type, layers: [{ ...layer }] };
    this.observers.forEach(observer => observer(event));
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
    return { ...layer };
  }

  getLayer(id: string): Layer | undefined {
    const layer = this.layers.get(id);
    return layer ? { ...layer } : undefined;
  }

  getAllLayers(): Layer[] {
    return [...this.layers.values()].map(layer => ({ ...layer }));
  }

  updateLayer(id: string, updates: Partial<LayerConfig>): void {
    const layer = this.layers.get(id);
    if (!layer) throw new Error(`Layer ${id} does not exist`);
    Object.assign(layer, updates, {
      opacity: updates.opacity === undefined
        ? layer.opacity
        : Math.max(0, Math.min(1, updates.opacity)),
    });
    this.emit('updated', layer);
  }

  deleteLayer(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) return;
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
    const layer = this.layers.get(id);
    if (!layer) throw new Error(`Layer ${id} does not exist`);
    layer.zIndex = zIndex;
    this.emit('reordered', layer);
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
    return filtered ? { ...filtered } : this.getLayer('default');
  }

  getVisibleLayers(): Layer[] {
    return this.getAllLayers().filter(layer => layer.visible);
  }

  getLayersByZIndex(): Layer[] {
    return this.getAllLayers().sort((left, right) =>
      left.zIndex - right.zIndex || left.id.localeCompare(right.id)
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
    this.selected = new Set(ids);
    const current = this.getSelected();
    if (
      previous.length !== current.length ||
      previous.some((id, index) => id !== current[index])
    ) {
      const event: SelectionChangeEvent = { previous, current };
      this.observers.forEach(observer => observer(event));
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

  private emit(): void {
    const event: HistoryStateEvent = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoSize: this.getUndoSize(),
      redoSize: this.getRedoSize(),
    };
    this.observers.forEach(observer => observer(event));
  }

  execute(command: Command): void {
    command.execute();
    if (!this.enabled) return;
    if (this.batch) this.batch.push(command);
    else {
      this.undoStack.push(command);
      this.redoStack.length = 0;
      this.emit();
    }
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.undo();
    this.redoStack.push(command);
    this.emit();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.redo();
    this.undoStack.push(command);
    this.emit();
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

  beginBatch(): void {
    if (!this.batch) this.batch = [];
  }

  endBatch(): void {
    if (!this.batch) return;
    if (this.batch.length) {
      this.undoStack.push(new MemoryBatchCommand(this.batch));
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
