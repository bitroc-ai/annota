import { afterEach, describe, expect, it, vi } from 'vitest';
import UPNG from 'upng-js';
import { AnnotaError } from '../../src/core/errors';
import {
  decodeInstancePixels,
  decodeRgb16Pixel,
  instanceRegionsToAnnotations,
  loadInstanceMask,
} from '../../src/loaders/instance-mask';
import { loadMaskPolygons } from '../../src/loaders/masks';

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as typeof globalThis & { cv?: unknown }).cv;
});

describe('instance mask decoder', () => {
  it('decodes RGB and RGBA IDs below and above 256 without pathology semantics', () => {
    const rgb = decodeInstancePixels(
      {
        width: 2,
        height: 1,
        channels: 3,
        data: new Uint8Array([0, 5, 7, 1, 2, 9]),
      },
      decodeRgb16Pixel
    );
    expect(rgb.map(region => region.instance)).toEqual([
      { instanceId: 5, attributes: { classId: 7 } },
      { instanceId: 258, attributes: { classId: 9 } },
    ]);

    const rgba = decodeInstancePixels(
      { width: 1, height: 1, channels: 4, data: new Uint8Array([1, 1, 3, 255]) },
      decodeRgb16Pixel
    );
    expect(rgba[0].instance.instanceId).toBe(257);
  });

  it('supports custom decoding, custom property mapping and empty images', async () => {
    expect(decodeInstancePixels(
      { width: 0, height: 0, channels: 4, data: new Uint8Array() },
      decodeRgb16Pixel
    )).toEqual([]);

    const annotations = await loadInstanceMask(
      {
        width: 1,
        height: 1,
        channels: 4,
        data: new Uint8Array([42, 0, 0, 255]),
      },
      {
        decodePixel: pixel => ({ instanceId: pixel.r, attributes: { score: 0.8 } }),
        mapProperties: instance => ({ confidence: instance.attributes?.score }),
        minArea: 0,
        extractContours: () => [{
          area: 1,
          points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
        }],
      }
    );
    expect(annotations[0].properties).toMatchObject({
      source: 'instance-mask',
      instanceId: 42,
      confidence: 0.8,
    });
    expect(JSON.stringify(annotations[0])).not.toMatch(/cell|nucleus|cancer/i);
  });

  it('reports corrupt input and invalid decoder output distinctly', async () => {
    await expect(
      loadInstanceMask(new ArrayBuffer(4), { decodePixel: decodeRgb16Pixel })
    ).rejects.toMatchObject({ code: 'MASK_DECODE_FAILED' });
    expect(() =>
      decodeInstancePixels(
        { width: 1, height: 1, channels: 3, data: new Uint8Array([1, 2, 3]) },
        () => ({ instanceId: 0 })
      )
    ).toThrow(AnnotaError);
  });

  it.each([false, true])(
    'releases every OpenCV disposable through the public compatibility loader (throws=%s)',
    async shouldThrow => {
      const disposables: Array<{ delete: ReturnType<typeof vi.fn> }> = [];
      class Mat {
        data = new Uint8Array(256);
        data32S = new Int32Array([1, 1, 5, 1, 1, 5]);
        delete = vi.fn();
        constructor() {
          disposables.push(this);
        }
      }
      class MatVector {
        items: Array<{ data32S: Int32Array }> = [];
        delete = vi.fn();
        constructor() {
          disposables.push(this);
        }
        size() {
          return this.items.length;
        }
        get(index: number) {
          const contour = this.items[index];
          const owned = new Mat();
          owned.data32S = contour.data32S;
          return owned;
        }
      }
      const cv = {
        Mat,
        MatVector,
        CV_8UC1: 0,
        RETR_EXTERNAL: 0,
        CHAIN_APPROX_SIMPLE: 0,
        findContours: (_source: Mat, contours: MatVector) => {
          contours.items = [{ data32S: new Int32Array([1, 1, 5, 1, 1, 5]) }];
        },
        contourArea: () => 25,
        arcLength: () => 12,
        approxPolyDP: (_contour: Mat, approx: Mat) => {
          if (shouldThrow) throw new Error('forced OpenCV failure');
          approx.data32S = new Int32Array([1, 1, 5, 1, 1, 5]);
        },
      };
      (globalThis as typeof globalThis & { cv: unknown }).cv = cv;
      const rgba = new Uint8Array(6 * 6 * 4);
      for (let index = 0; index < rgba.length; index += 4) {
        rgba[index] = 255;
        rgba[index + 1] = 255;
        rgba[index + 2] = 255;
        rgba[index + 3] = 255;
      }
      const png = UPNG.encode([rgba.buffer], 6, 6, 0);
      vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => png,
      })));

      if (shouldThrow) {
        await expect(
          loadMaskPolygons('/mask.png', { maskType: 'binary' })
        ).rejects.toMatchObject({ code: 'OPENCV_EXTRACTION_FAILED' });
      } else {
        await expect(
          loadMaskPolygons('/mask.png', { maskType: 'binary' })
        ).resolves.toHaveLength(1);
      }
      expect(disposables.length).toBeGreaterThanOrEqual(5);
      disposables.forEach(disposable => expect(disposable.delete).toHaveBeenCalledTimes(1));
    }
  );

  it.each(['contours', 'hierarchy'] as const)(
    'cleans earlier OpenCV allocations when the %s constructor throws',
    async failingAllocation => {
      const disposables: Array<{ delete: ReturnType<typeof vi.fn> }> = [];
      let matCount = 0;
      class Mat {
        data = new Uint8Array(16);
        data32S = new Int32Array();
        delete = vi.fn();
        constructor(..._args: unknown[]) {
          matCount += 1;
          if (failingAllocation === 'hierarchy' && matCount === 2) {
            throw new Error('hierarchy allocation failed');
          }
          disposables.push(this);
        }
      }
      class MatVector {
        delete = vi.fn();
        constructor() {
          if (failingAllocation === 'contours') {
            throw new Error('contours allocation failed');
          }
          disposables.push(this);
        }
        size() {
          return 0;
        }
        get() {
          return new Mat();
        }
      }
      (globalThis as typeof globalThis & { cv: unknown }).cv = {
        Mat,
        MatVector,
        CV_8UC1: 0,
        RETR_EXTERNAL: 0,
        CHAIN_APPROX_SIMPLE: 0,
        findContours: vi.fn(),
        contourArea: vi.fn(),
        arcLength: vi.fn(),
        approxPolyDP: vi.fn(),
      };

      await expect(instanceRegionsToAnnotations([
        {
          instance: { instanceId: 7 },
          pixels: [{ x: 0, y: 0 }],
          minX: 0,
          minY: 0,
          maxX: 0,
          maxY: 0,
        },
      ], { minArea: 0 })).rejects.toMatchObject({ code: 'OPENCV_EXTRACTION_FAILED' });
      expect(disposables).toHaveLength(failingAllocation === 'contours' ? 1 : 2);
      disposables.forEach(disposable => expect(disposable.delete).toHaveBeenCalledTimes(1));
    }
  );
});
