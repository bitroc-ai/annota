import { describe, expect, it } from 'vitest';
import { AnnotaError } from '../../src/core/errors';
import {
  decodeInstancePixels,
  decodeRgb16Pixel,
  loadInstanceMask,
} from '../../src/loaders/instance-mask';

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
});
