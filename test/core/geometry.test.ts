import { describe, expect, it } from 'vitest';
import { createGeometryController } from '../../src/core/geometry';
import { normalizeAnnotation } from '../../src/core/normalization';

const rectangle = (x: number, y: number, width: number, height: number) =>
  normalizeAnnotation({
    id: `${x}-${y}`,
    shape: { type: 'rectangle', x, y, width, height },
  }).shape;

describe('GeometryController', () => {
  it('separates exact geometry from bounds candidates', () => {
    const geometry = createGeometryController();
    const left = rectangle(0, 0, 10, 10);
    const overlap = rectangle(5, 5, 10, 10);
    const outside = rectangle(20, 20, 2, 2);
    expect(geometry.intersects(left, overlap)).toBe(true);
    expect(geometry.intersects(left, outside)).toBe(false);
    expect(geometry.contains(left, rectangle(2, 2, 2, 2))).toBe(true);
    expect(geometry.iou(left, overlap)).toBeCloseTo(25 / 175);
    expect(geometry.intersection(left, overlap)?.bounds).toEqual({
      minX: 5,
      minY: 5,
      maxX: 10,
      maxY: 10,
    });
  });

  it('merges and splits only shapes, without domain properties', () => {
    const geometry = createGeometryController();
    expect(geometry.merge([rectangle(0, 0, 10, 10), rectangle(5, 0, 10, 10)]))
      .not.toBeNull();
    const pieces = geometry.split(
      rectangle(0, 0, 10, 10),
      [{ x: 5, y: -1 }, { x: 5, y: 11 }]
    );
    expect(pieces.length).toBeGreaterThanOrEqual(2);
  });
});
