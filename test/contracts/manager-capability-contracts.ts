import { describe, expect, it, vi } from 'vitest';
import type { AnnotationStore, StoreChangeEvent } from '../../src/core/store';
import type { Annotation, AnnotationInput } from '../../src/core/types';
import { normalizeAnnotation } from '../../src/core/normalization';
import {
  AnnotationExistsError,
  AnnotationNotFoundError,
  AnnotationValidationError,
} from '../../src/core/errors';
import type { LayerManager } from '../../src/core/layer';
import type { SelectionManager } from '../../src/core/selection';
import type {
  Command,
  HistoryManager,
  HistoryManagerOptions,
} from '../../src/core/history';

export type CapabilityFactory<T> = () => T;
export type HistoryCapabilityFactory = (options?: HistoryManagerOptions) => HistoryManager;

const point = (id: string, x: number): AnnotationInput => ({
  id,
  shape: { type: 'point', point: { x, y: x } },
});

const rectangle = (id: string, x: number): AnnotationInput => ({
  id,
  shape: { type: 'rectangle', x, y: 0, width: 10, height: 10 },
});

const ids = (annotations: readonly Annotation[]) => annotations.map(annotation => annotation.id);

/**
 * Shared contract for the public AnnotationStore injection capability.
 * Extension implementations must pass this unchanged.
 */
export function defineAnnotationStoreContract(
  implementation: string,
  factory: CapabilityFactory<AnnotationStore>
): void {
  describe(`AnnotationStore capability: ${implementation}`, () => {
    it('normalizes insert writes and rejects conflicts atomically', () => {
      const manager = factory();
      const observer = vi.fn();
      manager.observe(observer);
      manager.add({
        ...rectangle('existing', 0),
        shape: {
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          bounds: { minX: -100, minY: -100, maxX: 100, maxY: 100 },
        },
      });
      expect(manager.get('existing')?.shape.bounds).toEqual({
        minX: 0, minY: 0, maxX: 10, maxY: 10,
      });

      expect(() => manager.addAll([
        point('new-before-conflict', 20),
        point('existing', 30),
      ])).toThrow(AnnotationExistsError);
      expect(ids(manager.all())).toEqual(['existing']);
      expect(manager.search({ minX: 20, minY: 20, maxX: 20, maxY: 20 })).toEqual([]);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it('classifies explicit and compatibility upserts in one atomic event', () => {
      const manager = factory();
      manager.add(point('existing', 1));
      const observer = vi.fn();
      manager.observe(observer);

      manager.addAll([point('existing', 2), point('created', 3)], { mode: 'upsert' });
      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer.mock.calls[0][0]).toMatchObject({
        created: [{ id: 'created' }],
        updated: [{
          oldValue: { id: 'existing', shape: { bounds: { minX: 1 } } },
          newValue: { id: 'existing', shape: { bounds: { minX: 2 } } },
        }],
        deleted: [],
      });

      manager.addAll([point('existing', 4), point('legacy-created', 5)], false);
      expect(manager.get('existing')?.shape.bounds.minX).toBe(4);
      expect(ids(manager.all())).toEqual(['existing', 'created', 'legacy-created']);
      expect(observer).toHaveBeenCalledTimes(2);
    });

    it('replaces the whole dataset with created, updated and deleted classification', () => {
      const manager = factory();
      manager.addAll([point('retained', 1), point('removed', 2)]);
      const observer = vi.fn();
      manager.observe(observer);

      manager.replaceAll([point('retained', 4), point('created', 5)]);
      expect(ids(manager.all())).toEqual(['retained', 'created']);
      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer.mock.calls[0][0]).toMatchObject({
        created: [{ id: 'created' }],
        updated: [{
          oldValue: { id: 'retained', shape: { bounds: { minX: 1 } } },
          newValue: { id: 'retained', shape: { bounds: { minX: 4 } } },
        }],
        deleted: [{ id: 'removed' }],
      });

      manager.addAll([point('compatibility-replacement', 8)], true);
      expect(ids(manager.all())).toEqual(['compatibility-replacement']);
      expect(observer).toHaveBeenCalledTimes(2);
    });

    it('rejects duplicate or invalid batches without changing data, events or spatial results', () => {
      const manager = factory();
      manager.add(rectangle('anchor', 0));
      const observer = vi.fn();
      manager.observe(observer);

      expect(() => manager.addAll([
        point('duplicate', 20),
        point('duplicate', 30),
      ], { mode: 'upsert' })).toThrow(AnnotationValidationError);
      expect(() => manager.replaceAll([
        point('duplicate', 20),
        point('duplicate', 30),
      ])).toThrow(AnnotationValidationError);
      expect(() => manager.addAll([
        point('valid-before-invalid', 40),
        {
          id: 'invalid',
          shape: { type: 'point', point: { x: Number.NaN, y: 0 } },
        },
      ])).toThrow(AnnotationValidationError);

      expect(ids(manager.all())).toEqual(['anchor']);
      expect(ids(manager.search({ minX: 0, minY: 0, maxX: 10, maxY: 10 })))
        .toEqual(['anchor']);
      expect(manager.search({ minX: 20, minY: 0, maxX: 50, maxY: 50 })).toEqual([]);
      expect(observer).not.toHaveBeenCalled();
    });

    it('rejects update ID mismatch and missing IDs without side effects', () => {
      const manager = factory();
      manager.add(point('stable', 1));
      const observer = vi.fn();
      manager.observe(observer);

      expect(() => manager.update('stable', point('different', 5)))
        .toThrow(AnnotationValidationError);
      expect(() => manager.update('missing', point('missing', 5)))
        .toThrow(AnnotationNotFoundError);
      expect(manager.get('stable')?.shape.bounds.minX).toBe(1);
      expect(observer).not.toHaveBeenCalled();
    });

    it('keeps normalized store and spatial queries consistent after update and delete', () => {
      const manager = factory();
      manager.add(rectangle('moving', 0));
      const observer = vi.fn();
      manager.observe(observer);
      manager.update('moving', {
        ...rectangle('moving', 100),
        shape: {
          type: 'rectangle',
          x: 100,
          y: 0,
          width: 10,
          height: 10,
          bounds: { minX: -1, minY: -1, maxX: 999, maxY: 999 },
        },
      });

      expect(manager.search({ minX: 0, minY: 0, maxX: 10, maxY: 10 })).toEqual([]);
      expect(ids(manager.search({ minX: 100, minY: 0, maxX: 110, maxY: 10 })))
        .toEqual(['moving']);
      expect(manager.getAt(105, 5)?.id).toBe('moving');
      expect(manager.getAt(105, 5, () => false)).toBeUndefined();
      expect(observer.mock.calls[0][0]).toMatchObject({
        created: [],
        updated: [{
          oldValue: { shape: { bounds: { minX: 0, maxX: 10 } } },
          newValue: { shape: { bounds: { minX: 100, maxX: 110 } } },
        }],
        deleted: [],
      });

      manager.delete('moving');
      expect(manager.search({ minX: 100, minY: 0, maxX: 110, maxY: 10 })).toEqual([]);
      expect(observer.mock.calls[1][0]).toMatchObject({
        created: [],
        updated: [],
        deleted: [{ id: 'moving' }],
      });
    });

    it('pairs observers, suppresses no-op events and isolates observer failures', () => {
      const manager = factory();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const throwing = vi.fn(() => {
        throw new Error('observer failure');
      });
      const healthy = vi.fn<(event: StoreChangeEvent) => void>();
      manager.observe(throwing);
      manager.observe(healthy);
      manager.add(point('observed', 1));
      expect(healthy).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledTimes(1);

      manager.delete('missing');
      expect(healthy).toHaveBeenCalledTimes(1);
      manager.unobserve(healthy);
      manager.delete('observed');
      expect(healthy).toHaveBeenCalledTimes(1);
      manager.clear();
      expect(healthy).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
    });
  });
}

/**
 * Shared contract for the public LayerManager injection capability.
 * Ordering is stable by creation order when z-index values are equal.
 */
export function defineLayerManagerContract(
  implementation: string,
  factory: CapabilityFactory<LayerManager>
): void {
  describe(`LayerManager capability: ${implementation}`, () => {
    it('provides protected image/default layers and stable same-z-index creation order', () => {
      const manager = factory();
      expect(manager.getLayersByZIndex().map(layer => layer.id)).toEqual(['image', 'default']);
      manager.createLayer('z-last-by-name', { zIndex: 5 });
      manager.createLayer('a-first-by-name', { zIndex: 5 });
      expect(manager.getLayersByZIndex().map(layer => layer.id)).toEqual([
        'image', 'default', 'z-last-by-name', 'a-first-by-name',
      ]);

      manager.updateLayer('z-last-by-name', { name: 'renamed', opacity: 0.4 });
      manager.setLayerZIndex('z-last-by-name', 5);
      expect(manager.getLayersByZIndex().map(layer => layer.id)).toEqual([
        'image', 'default', 'z-last-by-name', 'a-first-by-name',
      ]);
    });

    it('clamps opacity and applies visibility, locking and z-index with classified events', () => {
      const manager = factory();
      const observer = vi.fn();
      manager.observe(observer);
      manager.createLayer('controlled', { opacity: 5, zIndex: 2 });
      expect(manager.getLayer('controlled')?.opacity).toBe(1);
      manager.setLayerOpacity('controlled', -5);
      manager.setLayerVisibility('controlled', false);
      manager.setLayerLocked('controlled', true);
      manager.setLayerZIndex('controlled', -3);

      expect(manager.getLayer('controlled')).toMatchObject({
        opacity: 0,
        visible: false,
        locked: true,
        zIndex: -3,
      });
      expect(manager.isLayerVisible('controlled')).toBe(false);
      expect(manager.isLayerLocked('controlled')).toBe(true);
      expect(manager.getVisibleLayers().map(layer => layer.id)).not.toContain('controlled');
      expect(manager.getLayersByZIndex()[0].id).toBe('controlled');
      expect(observer.mock.calls.map(call => call[0].type)).toEqual([
        'created', 'updated', 'updated', 'updated', 'reordered',
      ]);
    });

    it('routes explicit, legacy, filtered and fallback layer membership', () => {
      const manager = factory();
      manager.createLayer('explicit', {});
      manager.createLayer('filtered', {
        filter: annotation => annotation.properties.kind === 'special',
      });
      const explicit = normalizeAnnotation({
        ...point('explicit-ann', 1),
        layerId: 'explicit',
        properties: { kind: 'special' },
      });
      const legacy = normalizeAnnotation({
        ...point('legacy-ann', 2),
        properties: { layer: 'explicit' },
      });
      const filtered = {
        ...normalizeAnnotation({
          ...point('filtered-ann', 3),
          properties: { kind: 'special' },
        }),
        layerId: undefined,
      };
      const fallback = normalizeAnnotation(point('fallback-ann', 4));

      expect(manager.getLayerForAnnotation(explicit)?.id).toBe('explicit');
      expect(manager.getLayerForAnnotation(legacy)?.id).toBe('explicit');
      expect(manager.getLayerForAnnotation(filtered)?.id).toBe('filtered');
      expect(manager.getLayerForAnnotation(fallback)?.id).toBe('default');
    });

    it('returns frozen detached snapshots from every read and layer event boundary', () => {
      const manager = factory();
      manager.createLayer('explicit-snapshot', {});
      manager.createLayer('filtered-snapshot', {
        filter: annotation => annotation.properties.kind === 'snapshot',
      });
      const observer = vi.fn();
      manager.observe(observer);
      const created = manager.createLayer('event-snapshot', { visible: true });

      const assertEventSnapshot = (
        index: number,
        type: 'created' | 'updated' | 'reordered' | 'deleted'
      ) => {
        const event = observer.mock.calls[index][0];
        expect(event.type).toBe(type);
        expect(Object.isFrozen(event)).toBe(true);
        expect(Object.isFrozen(event.layers)).toBe(true);
        expect(Object.isFrozen(event.layers[0])).toBe(true);
        expect(Reflect.set(event.layers[0], 'visible', false)).toBe(false);
        expect(Reflect.set(event.layers, 0, manager.getLayer('default'))).toBe(false);
        return event;
      };

      const createdEvent = assertEventSnapshot(0, 'created');
      const createdRead = manager.getLayer('event-snapshot')!;
      expect(createdEvent.layers[0]).not.toBe(created);
      expect(createdEvent.layers[0]).not.toBe(createdRead);
      expect(createdRead.visible).toBe(true);

      manager.updateLayer('event-snapshot', { name: 'Updated Snapshot' });
      const updatedEvent = assertEventSnapshot(1, 'updated');
      const updatedRead = manager.getLayer('event-snapshot')!;
      expect(updatedEvent.layers[0]).not.toBe(createdEvent.layers[0]);
      expect(updatedEvent.layers[0]).not.toBe(updatedRead);
      expect(updatedRead).toMatchObject({
        name: 'Updated Snapshot',
        visible: true,
      });

      manager.setLayerZIndex('event-snapshot', 7);
      const reorderedEvent = assertEventSnapshot(2, 'reordered');
      const reorderedRead = manager.getLayer('event-snapshot')!;
      expect(reorderedEvent.layers[0]).not.toBe(updatedEvent.layers[0]);
      expect(reorderedEvent.layers[0]).not.toBe(reorderedRead);
      expect(reorderedRead).toMatchObject({
        zIndex: 7,
        visible: true,
      });

      manager.deleteLayer('event-snapshot');
      const deletedEvent = assertEventSnapshot(3, 'deleted');
      expect(deletedEvent.layers[0]).not.toBe(reorderedEvent.layers[0]);
      expect(manager.getLayer('event-snapshot')).toBeUndefined();
      expect(new Set([createdEvent, updatedEvent, reorderedEvent, deletedEvent]).size).toBe(4);
      expect(new Set([
        createdEvent.layers,
        updatedEvent.layers,
        reorderedEvent.layers,
        deletedEvent.layers,
      ]).size).toBe(4);

      const explicitAnnotation = normalizeAnnotation({
        ...point('explicit-snapshot-ann', 1),
        layerId: 'explicit-snapshot',
      });
      const filteredAnnotation = {
        ...normalizeAnnotation({
          ...point('filtered-snapshot-ann', 2),
          properties: { kind: 'snapshot' },
        }),
        layerId: undefined,
      };
      const fallbackAnnotation = normalizeAnnotation(point('fallback-snapshot-ann', 3));
      const all = manager.getAllLayers();
      const visible = manager.getVisibleLayers();
      const ordered = manager.getLayersByZIndex();
      const snapshots = [
        created,
        manager.getLayer('explicit-snapshot')!,
        ...all,
        ...visible,
        ...ordered,
        manager.getLayerForAnnotation(explicitAnnotation)!,
        manager.getLayerForAnnotation(filteredAnnotation)!,
        manager.getLayerForAnnotation(fallbackAnnotation)!,
      ];

      expect(Object.isFrozen(all)).toBe(true);
      expect(Object.isFrozen(visible)).toBe(true);
      expect(Object.isFrozen(ordered)).toBe(true);
      snapshots.forEach(snapshot => {
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Reflect.set(snapshot, 'visible', false)).toBe(false);
      });

      expect(manager.getLayer('explicit-snapshot')?.visible).toBe(true);
      expect(manager.getLayer('filtered-snapshot')?.visible).toBe(true);
      expect(manager.getLayer('default')?.visible).toBe(true);
      expect(observer).toHaveBeenCalledTimes(4);
    });

    it('rejects duplicates and safely ignores missing or protected mutations', () => {
      const manager = factory();
      const observer = vi.fn();
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager.observe(observer);
      manager.createLayer('unique', {});
      expect(() => manager.createLayer('unique', {})).toThrow(/already exists/);
      manager.updateLayer('missing', { name: 'ignored' });
      manager.deleteLayer('missing');
      manager.deleteLayer('default');
      manager.deleteLayer('image');

      expect(manager.getLayer('default')).toBeDefined();
      expect(manager.getLayer('image')).toBeDefined();
      expect(observer).toHaveBeenCalledTimes(1);
      expect(warning).toHaveBeenCalledTimes(4);
      warning.mockRestore();
    });

    it('pairs idempotent observers and isolates observer failures', () => {
      const manager = factory();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const throwing = vi.fn(() => {
        throw new Error('observer failure');
      });
      const healthy = vi.fn();
      manager.observe(throwing);
      manager.observe(healthy);
      manager.observe(healthy);
      manager.createLayer('observed', {});
      expect(healthy).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledTimes(1);

      manager.unobserve(healthy);
      manager.updateLayer('observed', { name: 'not observed' });
      expect(healthy).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
    });
  });
}

/**
 * Shared contract for the public SelectionManager injection capability.
 */
export function defineSelectionManagerContract(
  implementation: string,
  factory: CapabilityFactory<SelectionManager>
): void {
  describe(`SelectionManager capability: ${implementation}`, () => {
    it('deduplicates selection, preserves first insertion order and treats reordering as a no-op', () => {
      const manager = factory();
      const observer = vi.fn();
      manager.observe(observer);
      manager.select(['a', 'a', 'b']);
      expect(manager.getSelected()).toEqual(['a', 'b']);
      expect(observer).toHaveBeenCalledWith({ previous: [], current: ['a', 'b'] });

      manager.select(['b', 'a']);
      expect(manager.getSelected()).toEqual(['a', 'b']);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it('supports toggle/add/remove/clear queries with exact transition events', () => {
      const manager = factory();
      const observer = vi.fn();
      manager.observe(observer);
      manager.add(['a', 'b', 'a']);
      manager.toggle('a');
      manager.toggle('c');
      manager.remove(['missing', 'b']);
      expect(manager.getSelected()).toEqual(['c']);
      expect(manager.isSelected('c')).toBe(true);
      expect(manager.hasSelection()).toBe(true);
      expect(manager.getSelectionCount()).toBe(1);
      manager.clear();
      expect(manager.getSelected()).toEqual([]);
      expect(observer.mock.calls.map(call => call[0])).toEqual([
        { previous: [], current: ['a', 'b'] },
        { previous: ['a', 'b'], current: ['b'] },
        { previous: ['b'], current: ['b', 'c'] },
        { previous: ['b', 'c'], current: ['c'] },
        { previous: ['c'], current: [] },
      ]);
    });

    it('suppresses no-op selection operations', () => {
      const manager = factory();
      const observer = vi.fn();
      manager.observe(observer);
      manager.select([]);
      manager.add([]);
      manager.remove('missing');
      manager.clear();
      expect(observer).not.toHaveBeenCalled();
    });

    it('pairs idempotent observers and isolates observer failures', () => {
      const manager = factory();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const throwing = vi.fn(() => {
        throw new Error('observer failure');
      });
      const healthy = vi.fn();
      manager.observe(throwing);
      manager.observe(healthy);
      manager.observe(healthy);
      manager.select('a');
      expect(healthy).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledTimes(1);

      manager.unobserve(healthy);
      manager.select('b');
      expect(healthy).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
    });
  });
}

function numericCommand(
  state: { value: number },
  amount: number,
  log?: string[]
): Command {
  return {
    execute: () => {
      state.value += amount;
      log?.push(`execute:${amount}`);
    },
    undo: () => {
      state.value -= amount;
      log?.push(`undo:${amount}`);
    },
    redo: () => {
      state.value += amount;
      log?.push(`redo:${amount}`);
    },
  };
}

/**
 * Shared contract for the public HistoryManager injection capability and factory options.
 */
export function defineHistoryManagerContract(
  implementation: string,
  factory: HistoryCapabilityFactory
): void {
  describe(`HistoryManager capability: ${implementation}`, () => {
    it('executes a batch immediately, observes it once and undoes it in reverse order', () => {
      const manager = factory({ enableMerging: false });
      const state = { value: 0 };
      const log: string[] = [];
      const observer = vi.fn();
      manager.observe(observer);
      manager.beginBatch('two changes');
      manager.execute(numericCommand(state, 1, log));
      manager.execute(numericCommand(state, 2, log));
      expect(state.value).toBe(3);
      expect(observer).not.toHaveBeenCalled();
      manager.endBatch();
      expect(manager.getUndoSize()).toBe(1);
      expect(observer).toHaveBeenCalledTimes(1);
      manager.undo();
      expect(state.value).toBe(0);
      expect(log.slice(-2)).toEqual(['undo:2', 'undo:1']);
      manager.redo();
      expect(state.value).toBe(3);
      expect(manager.getRedoSize()).toBe(0);
    });

    it('does not record disabled commands and resumes normal recording when enabled', () => {
      const manager = factory({ enableMerging: false });
      const state = { value: 0 };
      const observer = vi.fn();
      manager.observe(observer);
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
      manager.execute(numericCommand(state, 2));
      expect(state.value).toBe(2);
      expect(manager.canUndo()).toBe(false);
      expect(observer).not.toHaveBeenCalled();
      manager.enable();
      manager.execute(numericCommand(state, 3));
      expect(manager.isEnabled()).toBe(true);
      expect(manager.getUndoSize()).toBe(1);
    });

    it('keeps execute, batch, undo and redo failures out of the wrong stack', () => {
      const manager = factory({ enableMerging: false });
      const observer = vi.fn();
      manager.observe(observer);
      const executeFailure: Command = {
        execute: () => { throw new Error('execute failed'); },
        undo: vi.fn(),
        redo: vi.fn(),
      };
      expect(() => manager.execute(executeFailure)).toThrow('execute failed');
      expect(manager.getUndoSize()).toBe(0);
      expect(observer).not.toHaveBeenCalled();

      const state = { value: 0 };
      manager.beginBatch('partial failure');
      manager.execute(numericCommand(state, 1));
      expect(() => manager.execute(executeFailure)).toThrow('execute failed');
      manager.endBatch();
      expect(manager.getUndoSize()).toBe(1);
      manager.undo();
      expect(state.value).toBe(0);
      expect(executeFailure.undo).not.toHaveBeenCalled();

      let failUndo = true;
      let failRedo = true;
      const reversible: Command = {
        execute: () => { state.value = 10; },
        undo: () => {
          if (failUndo) throw new Error('undo failed');
          state.value = 0;
        },
        redo: () => {
          if (failRedo) throw new Error('redo failed');
          state.value = 10;
        },
      };
      manager.execute(reversible);
      expect(() => manager.undo()).toThrow('undo failed');
      expect(manager.getUndoSize()).toBe(1);
      expect(manager.getRedoSize()).toBe(0);
      failUndo = false;
      manager.undo();
      expect(manager.getUndoSize()).toBe(0);
      expect(manager.getRedoSize()).toBe(1);
      expect(() => manager.redo()).toThrow('redo failed');
      expect(manager.getUndoSize()).toBe(0);
      expect(manager.getRedoSize()).toBe(1);
      failRedo = false;
      manager.redo();
      expect(manager.getUndoSize()).toBe(1);
      expect(manager.getRedoSize()).toBe(0);
    });

    it('clears redo on a new command and on a committed non-empty batch', () => {
      const manager = factory({ enableMerging: false });
      const state = { value: 0 };
      manager.execute(numericCommand(state, 1));
      manager.undo();
      expect(manager.canRedo()).toBe(true);
      manager.execute(numericCommand(state, 2));
      expect(manager.canRedo()).toBe(false);

      manager.undo();
      expect(manager.canRedo()).toBe(true);
      manager.beginBatch();
      manager.execute(numericCommand(state, 3));
      manager.endBatch();
      expect(manager.canRedo()).toBe(false);
    });

    it('honors command merging and maximum history size options', () => {
      const state = { value: 0 };
      const mergingFactory = (amount: number) => {
        let total = amount;
        return {
          amount,
          execute: () => { state.value += amount; },
          undo: () => { state.value -= total; },
          redo: () => { state.value += total; },
          merge(command: Command) {
            const candidate = command as Command & { amount?: number };
            if (candidate.amount === undefined) return false;
            total += candidate.amount;
            return true;
          },
        } satisfies Command & { amount: number };
      };
      const merging = factory({ enableMerging: true });
      merging.execute(mergingFactory(1));
      merging.execute(mergingFactory(2));
      expect(state.value).toBe(3);
      expect(merging.getUndoSize()).toBe(1);
      merging.undo();
      expect(state.value).toBe(0);

      const limited = factory({ enableMerging: false, maxHistorySize: 2 });
      limited.execute(numericCommand(state, 1));
      limited.execute(numericCommand(state, 2));
      limited.execute(numericCommand(state, 3));
      expect(limited.getUndoSize()).toBe(2);
      limited.undo();
      limited.undo();
      expect(limited.canUndo()).toBe(false);
    });

    it('clears a stale redo branch after a successful merge and emits the merged state once', () => {
      const manager = factory({ enableMerging: true });
      const state = { value: 0 };
      let total = 1;
      const merge = vi.fn((command: Command) => {
        const candidate = command as Command & { amount?: number };
        if (candidate.amount === undefined) return false;
        total += candidate.amount;
        return true;
      });
      const commandA: Command & { amount: number } = {
        amount: 1,
        execute: () => { state.value += 1; },
        undo: () => { state.value -= total; },
        redo: () => { state.value += total; },
        merge,
      };
      const commandB = numericCommand(state, 10);
      const commandC: Command & { amount: number } = {
        amount: 2,
        execute: () => { state.value += 2; },
        undo: () => { state.value -= 2; },
        redo: () => { state.value += 2; },
      };

      manager.execute(commandA);
      manager.execute(commandB);
      manager.undo();
      expect(state.value).toBe(1);
      expect(manager.getRedoSize()).toBe(1);
      merge.mockClear();

      const observer = vi.fn();
      manager.observe(observer);
      manager.execute(commandC);
      expect(merge).toHaveBeenCalledTimes(1);
      expect(state.value).toBe(3);
      expect(manager.getUndoSize()).toBe(1);
      expect(manager.getRedoSize()).toBe(0);
      expect(manager.canRedo()).toBe(false);
      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer).toHaveBeenLastCalledWith({
        canUndo: true,
        canRedo: false,
        undoSize: 1,
        redoSize: 0,
      });

      manager.redo();
      expect(state.value).toBe(3);
      expect(observer).toHaveBeenCalledTimes(1);
      manager.undo();
      expect(state.value).toBe(0);
      expect(manager.getUndoSize()).toBe(0);
      expect(manager.getRedoSize()).toBe(1);
      expect(observer).toHaveBeenCalledTimes(2);
      expect(observer).toHaveBeenLastCalledWith({
        canUndo: false,
        canRedo: true,
        undoSize: 0,
        redoSize: 1,
      });
    });

    it('does not mutate an existing merge candidate when the new command fails to execute', () => {
      const manager = factory({ enableMerging: true });
      const state = { value: 0 };
      const observer = vi.fn();
      let undoAmount = 1;
      const merge = vi.fn((command: Command) => {
        undoAmount += (command as Command & { amount?: number }).amount ?? 0;
        return true;
      });
      const existing: Command = {
        execute: () => { state.value += 1; },
        undo: () => { state.value -= undoAmount; },
        redo: () => { state.value += undoAmount; },
        merge,
      };
      manager.execute(existing);
      manager.observe(observer);
      const failing: Command & { amount: number } = {
        amount: 2,
        execute: () => { throw new Error('merged execute failed'); },
        undo: vi.fn(),
        redo: vi.fn(),
      };

      expect(() => manager.execute(failing)).toThrow('merged execute failed');
      expect(merge).not.toHaveBeenCalled();
      expect(state.value).toBe(1);
      expect(manager.getUndoSize()).toBe(1);
      expect(manager.getRedoSize()).toBe(0);
      expect(observer).not.toHaveBeenCalled();
      manager.undo();
      expect(state.value).toBe(0);
      expect(manager.getUndoSize()).toBe(0);
      expect(manager.getRedoSize()).toBe(1);
      expect(observer).toHaveBeenCalledTimes(1);
    });

    it('pairs idempotent observers, emits state snapshots and isolates observer failures', () => {
      const manager = factory({ enableMerging: false });
      const state = { value: 0 };
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const throwing = vi.fn(() => {
        throw new Error('observer failure');
      });
      const healthy = vi.fn();
      manager.observe(throwing);
      manager.observe(healthy);
      manager.observe(healthy);
      manager.execute(numericCommand(state, 1));
      expect(healthy).toHaveBeenCalledTimes(1);
      expect(healthy).toHaveBeenLastCalledWith({
        canUndo: true,
        canRedo: false,
        undoSize: 1,
        redoSize: 0,
      });
      expect(consoleError).toHaveBeenCalledTimes(1);

      manager.unobserve(healthy);
      manager.clear();
      expect(healthy).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
    });

    it('ends an empty batch without creating history and reports the resulting state', () => {
      const manager = factory({ enableMerging: false });
      const observer = vi.fn();
      manager.observe(observer);
      manager.beginBatch('empty');
      manager.endBatch();
      expect(manager.getUndoSize()).toBe(0);
      expect(observer).toHaveBeenCalledWith({
        canUndo: false,
        canRedo: false,
        undoSize: 0,
        redoSize: 0,
      });
    });
  });
}
