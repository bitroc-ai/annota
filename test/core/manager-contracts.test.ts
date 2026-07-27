import { describe, expect, it, vi } from 'vitest';
import { createAnnotationStore } from '../../src/core/store';
import { createLayerManager } from '../../src/core/layer';
import { createSelectionManager } from '../../src/core/selection';
import {
  createHistoryManager,
  type Command,
} from '../../src/core/history';
import {
  MemoryAnnotationStore,
  MemoryHistoryManager,
  MemoryLayerManager,
  MemorySelectionManager,
} from '../helpers/custom-managers';

const point = (id: string, x: number) => ({
  id,
  shape: { type: 'point' as const, point: { x, y: x } },
});

describe.each([
  ['built-in', () => createAnnotationStore()],
  ['independent custom implementation', () => new MemoryAnnotationStore()],
])('AnnotationStore contract: %s', (_name, factory) => {
  it('provides atomic normalized CRUD and paired observation', () => {
    const manager = factory();
    const observer = vi.fn();
    manager.observe(observer);
    manager.add(point('a', 1));
    manager.update('a', point('a', 2));
    expect(manager.get('a')?.shape.bounds.minX).toBe(2);
    manager.delete('a');
    manager.unobserve(observer);
    manager.add(point('b', 3));
    expect(observer).toHaveBeenCalledTimes(3);
  });
});

describe.each([
  ['built-in', () => createLayerManager()],
  ['independent custom implementation', () => new MemoryLayerManager()],
])('LayerManager contract: %s', (_name, factory) => {
  it('supports stable z-index, opacity and paired observation', () => {
    const manager = factory();
    const observer = vi.fn();
    manager.observe(observer);
    manager.createLayer('top', { zIndex: 10, opacity: 0.5 });
    manager.createLayer('bottom', { zIndex: -2 });
    expect(manager.getLayersByZIndex().map(layer => layer.id)).toEqual([
      'bottom', 'image', 'default', 'top',
    ]);
    manager.setLayerOpacity('top', 0.25);
    expect(manager.getLayer('top')?.opacity).toBe(0.25);
    manager.unobserve(observer);
    manager.setLayerZIndex('top', 20);
    expect(observer).toHaveBeenCalledTimes(3);
  });
});

describe.each([
  ['built-in', () => createSelectionManager()],
  ['independent custom implementation', () => new MemorySelectionManager()],
])('SelectionManager contract: %s', (_name, factory) => {
  it('deduplicates selection and pairs observers', () => {
    const manager = factory();
    const observer = vi.fn();
    manager.observe(observer);
    manager.select(['a', 'a', 'b']);
    expect(manager.getSelected()).toEqual(['a', 'b']);
    manager.toggle('a');
    expect(manager.getSelected()).toEqual(['b']);
    manager.unobserve(observer);
    manager.clear();
    expect(observer).toHaveBeenCalledTimes(2);
  });
});

describe.each([
  ['built-in', () => createHistoryManager({ enableMerging: false })],
  ['independent custom implementation', () => new MemoryHistoryManager()],
])('HistoryManager contract: %s', (_name, factory) => {
  it('executes, undoes, redoes and batches as one step', () => {
    const manager = factory();
    let value = 0;
    const command = (amount: number): Command => ({
      execute: () => { value += amount; },
      undo: () => { value -= amount; },
      redo: () => { value += amount; },
    });
    manager.beginBatch('two changes');
    manager.execute(command(1));
    manager.execute(command(2));
    manager.endBatch();
    expect(value).toBe(3);
    expect(manager.getUndoSize()).toBe(1);
    manager.undo();
    expect(value).toBe(0);
    manager.redo();
    expect(value).toBe(3);
  });
});
