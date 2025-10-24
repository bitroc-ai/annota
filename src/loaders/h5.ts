/**
 * Annota Loaders - H5 Mask Files
 * Load H5 files containing cell masks and convert to point annotations
 */

import type { Annotation, PointShape } from '../core/types';

export interface H5MaskLoaderOptions {
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  properties?: Record<string, any>;
}

/**
 * Load H5 mask file and extract cell centers as point annotations
 * Uses jsfive to read H5 files directly in the browser
 *
 * @param h5Path - Path or URL to the H5 file
 * @param options - Style and property options
 * @returns Array of point annotations (one per cell)
 *
 * @example
 * ```ts
 * const annotations = await loadH5Masks('/annotations/image1.h5', {
 *   color: '#FF0000',
 *   fillOpacity: 0.8
 * });
 * annotator.addAnnotations(annotations);
 * ```
 */
export async function loadH5Masks(
  h5Path: string,
  options: H5MaskLoaderOptions = {}
): Promise<Annotation[]> {
  const { color = '#FF6B6B', fillOpacity = 0.8, strokeWidth = 2, properties = {} } = options;

  try {
    // Dynamically import jsfive (only when needed)
    // @ts-ignore - jsfive doesn't have type definitions
    const { File } = await import('jsfive');

    // Fetch the H5 file
    const response = await fetch(h5Path);
    if (!response.ok) {
      throw new Error(`Failed to fetch H5 file: ${h5Path}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const f = new File(arrayBuffer);

    // Try to find the masks dataset (common names: 'masks', 'instances', 'labels')
    let masks: any;
    const availableKeys = Object.keys(f.keys);

    if (f.get('masks')) {
      masks = f.get('masks');
    } else if (f.get('instances')) {
      masks = f.get('instances');
    } else if (f.get('labels')) {
      masks = f.get('labels');
    } else if (availableKeys.length > 0) {
      // Get the first dataset
      console.log(`Available H5 datasets: ${availableKeys.join(', ')}`);
      masks = f.get(availableKeys[0]);
      console.log(`Using first available dataset: ${availableKeys[0]}`);
    }

    if (!masks) {
      throw new Error(`No mask dataset found in H5 file. Available keys: ${availableKeys.join(', ') || 'none'}`);
    }

    const maskData = masks.value;
    const [height, width] = masks.shape;

    // Find unique cell IDs (excluding background = 0)
    const cellIds = new Set<number>();
    for (let i = 0; i < maskData.length; i++) {
      const value = maskData[i];
      if (value !== 0) cellIds.add(value);
    }

    // Calculate centroid for each cell
    const annotations: Annotation[] = [];
    cellIds.forEach(cellId => {
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (maskData[idx] === cellId) {
            sumX += x;
            sumY += y;
            count++;
          }
        }
      }

      if (count > 0) {
        const centerX = sumX / count;
        const centerY = sumY / count;

        const shape: PointShape = {
          type: 'point',
          point: { x: centerX, y: centerY },
          bounds: {
            minX: centerX,
            minY: centerY,
            maxX: centerX,
            maxY: centerY,
          },
        };

        annotations.push({
          id: `h5-mask-${cellId}`,
          shape,
          properties: {
            ...properties,
            source: 'h5-mask',
            cellId,
            area: count, // pixel count
          },
          style: {
            fill: color,
            fillOpacity,
            stroke: color,
            strokeWidth,
          },
        });
      }
    });

    return annotations;
  } catch (error) {
    console.error('Failed to load H5 masks:', error);
    throw error;
  }
}
