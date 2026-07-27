import { describe, expect, it, vi } from 'vitest';
import { AnnotationExistsError, AnnotationValidationError } from '../../src/core/errors';
import { createAnnotationStore } from '../../src/core/store';

const point = (id: string, x: number, properties?: Record<string, unknown>) => ({
  id,
  shape: { type: 'point' as const, point: { x, y: x }, bounds: {
    minX: -999,
    minY: -999,
    maxX: 999,
    maxY: 999,
  } },
  properties,
});

describe('AnnotationStore atomic contracts', () => {
  it('normalizes inputs and isolates external mutations', () => {
    const store = createAnnotationStore();
    const input = point('a', 4, { nested: 'value' });
    store.add(input);
    input.shape.point.x = 100;
    input.shape.bounds.minX = -1000;

    const stored = store.get('a');
    expect(stored?.shape.bounds).toEqual({ minX: 4, minY: 4, maxX: 4, maxY: 4 });
    expect(Object.isFrozen(stored)).toBe(true);
    expect(store.search({ minX: 3, minY: 3, maxX: 5, maxY: 5 }).map(item => item.id))
      .toEqual(['a']);
  });

  it('rejects an insert conflict atomically', () => {
    const store = createAnnotationStore();
    store.add(point('a', 1));
    const observer = vi.fn();
    store.observe(observer);

    expect(() =>
      store.addAll([point('b', 2), point('a', 3)], { mode: 'insert' })
    ).toThrow(AnnotationExistsError);
    expect(store.all().map(item => item.id)).toEqual(['a']);
    expect(store.search({ minX: 0, minY: 0, maxX: 10, maxY: 10 })).toHaveLength(1);
    expect(observer).not.toHaveBeenCalled();
  });

  it('classifies upserts into created and updated', () => {
    const store = createAnnotationStore();
    store.add(point('a', 1));
    const observer = vi.fn();
    store.observe(observer);
    store.addAll([point('a', 2), point('b', 3)], { mode: 'upsert' });

    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer.mock.calls[0][0].created.map((item: { id: string }) => item.id)).toEqual(['b']);
    expect(observer.mock.calls[0][0].updated.map(
      (item: { newValue: { id: string } }) => item.newValue.id
    )).toEqual(['a']);
  });

  it('replaces atomically and reports created, updated and deleted', () => {
    const store = createAnnotationStore();
    store.addAll([point('a', 1), point('gone', 2)], { mode: 'insert' });
    const observer = vi.fn();
    store.observe(observer);
    store.replaceAll([point('a', 4), point('new', 5)]);

    const event = observer.mock.calls[0][0];
    expect(event.created.map((item: { id: string }) => item.id)).toEqual(['new']);
    expect(event.updated.map((item: { newValue: { id: string } }) => item.newValue.id))
      .toEqual(['a']);
    expect(event.deleted.map((item: { id: string }) => item.id)).toEqual(['gone']);
    expect(store.search({ minX: 0, minY: 0, maxX: 10, maxY: 10 }).map(item => item.id))
      .toEqual(expect.arrayContaining(['a', 'new']));
  });

  it('rejects duplicate IDs within a batch before mutating either index', () => {
    const store = createAnnotationStore();
    expect(() =>
      store.addAll([point('same', 1), point('same', 2)], { mode: 'upsert' })
    ).toThrow(AnnotationValidationError);
    expect(store.all()).toEqual([]);
    expect(store.search({ minX: 0, minY: 0, maxX: 10, maxY: 10 })).toEqual([]);
  });

  it('keeps the deprecated boolean signature as an upsert/replace proxy', () => {
    const store = createAnnotationStore();
    store.add(point('a', 1));
    store.addAll([point('a', 2)], false);
    expect(store.get('a')?.shape.bounds.minX).toBe(2);
    store.addAll([point('b', 3)], true);
    expect(store.all().map(item => item.id)).toEqual(['b']);
  });
});
