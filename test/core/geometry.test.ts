import { describe, expect, it, vi } from 'vitest';
import { createGeometryController } from '../../src/core/geometry';
import { normalizeAnnotation } from '../../src/core/normalization';
import { mergeAnnotations } from '../../src/core/operations';

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

  it('rejects results with holes instead of silently filling them', () => {
    const geometry = createGeometryController();
    const frame = [
      rectangle(0, 0, 10, 2),
      rectangle(0, 8, 10, 2),
      rectangle(0, 2, 2, 6),
      rectangle(8, 2, 2, 6),
    ];

    expect(() => geometry.merge(frame)).toThrowError(
      expect.objectContaining({
        code: 'GEOMETRY_UNSUPPORTED',
        message: expect.stringContaining('contains holes'),
      })
    );

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const annotations = frame.map((shape, index) =>
      normalizeAnnotation({ id: `frame-${index}`, shape })
    );
    expect(mergeAnnotations(annotations)).toBeNull();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('current Shape model cannot represent')
    );
    error.mockRestore();
  });
});
