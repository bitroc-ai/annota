/**
 * Annota Loaders - H5 Format
 * Convert H5 data to Annota annotations
 */

import type { Annotation, PointShape } from '../core/types';

/**
 * H5 data structure
 * Represents a 2D array where:
 * - width = 2 (coordinate pairs)
 * - height = number of points
 * - data = [x0, x1, x2, ..., y0, y1, y2, ...]
 */
export interface H5Data {
  width: number;
  height: number;
  data: number[];
}

/**
 * H5 loader options
 */
export interface H5LoaderOptions {
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  properties?: Record<string, any>;
}

/**
 * Convert H5 data to Annota annotations
 *
 * @param h5Data - H5 data structure with coordinate information
 * @param options - Style and property options for the annotations
 * @returns Array of point annotations
 *
 * @example
 * ```ts
 * // Application layer loads the file
 * const h5Data = await loadH5FileFromTauri(path);
 * // or from API: const h5Data = await fetch('/api/annotations').then(r => r.json());
 *
 * // Library layer converts to annotations
 * const annotations = h5ToAnnotations(h5Data, {
 *   color: '#FF0000',
 *   fillOpacity: 0.5
 * });
 * ```
 */
export function h5ToAnnotations(h5Data: H5Data, options: H5LoaderOptions = {}): Annotation[] {
  const { color = '#00FF00', fillOpacity = 0.5, strokeWidth = 2, properties = {} } = options;

  // Validate H5 data format
  if (h5Data.width !== 2) {
    throw new Error(
      `Invalid H5 format: expected coordinate data (width=2), got width=${h5Data.width}`
    );
  }

  if (!Array.isArray(h5Data.data)) {
    throw new Error('Invalid H5 format: data must be an array');
  }

  const numPoints = h5Data.height;
  const expectedDataLength = numPoints * 2;

  if (h5Data.data.length !== expectedDataLength) {
    throw new Error(
      `Invalid H5 format: expected ${expectedDataLength} data points, got ${h5Data.data.length}`
    );
  }

  const annotations: Annotation[] = [];

  // Extract coordinates: data is [x0, x1, ..., y0, y1, ...]
  for (let i = 0; i < numPoints; i++) {
    const x = h5Data.data[i];
    const y = h5Data.data[numPoints + i];

    // Validate coordinates
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      console.warn(`Skipping invalid coordinate at index ${i}: (${x}, ${y})`);
      continue;
    }

    const shape: PointShape = {
      type: 'point',
      point: { x, y },
      bounds: { minX: x, minY: y, maxX: x, maxY: y },
    };

    annotations.push({
      id: `h5-point-${i}`,
      shape,
      properties: {
        ...properties,
        source: 'h5',
        index: i,
      },
      style: {
        fill: color,
        fillOpacity,
        stroke: color,
        strokeWidth,
      },
    });
  }

  return annotations;
}

/**
 * Parse H5 data from JSON string
 *
 * @param json - JSON string containing H5 data
 * @returns Parsed H5 data structure
 */
export function parseH5JSON(json: string): H5Data {
  try {
    const data = JSON.parse(json);

    if (typeof data.width !== 'number' || typeof data.height !== 'number') {
      throw new Error('Invalid H5 JSON: missing width or height');
    }

    if (!Array.isArray(data.data)) {
      throw new Error('Invalid H5 JSON: data must be an array');
    }

    return data as H5Data;
  } catch (error) {
    throw new Error(
      `Failed to parse H5 JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert H5 JSON string to annotations in one step
 *
 * @param json - JSON string containing H5 data
 * @param options - Style and property options
 * @returns Array of annotations
 */
export function h5JSONToAnnotations(json: string, options?: H5LoaderOptions): Annotation[] {
  const h5Data = parseH5JSON(json);
  return h5ToAnnotations(h5Data, options);
}

/**
 * Convert point annotations to H5 data format
 * Filters out non-point annotations
 *
 * @param annotations - Array of annotations
 * @returns H5 data structure
 */
export function annotationsToH5(annotations: Annotation[]): H5Data {
  // Filter only point annotations
  const pointAnnotations = annotations.filter(a => a.shape.type === 'point');

  if (pointAnnotations.length === 0) {
    return {
      width: 2,
      height: 0,
      data: [],
    };
  }

  const numPoints = pointAnnotations.length;
  const data: number[] = new Array(numPoints * 2);

  // Pack coordinates: [x0, x1, x2, ..., y0, y1, y2, ...]
  for (let i = 0; i < numPoints; i++) {
    const point = (pointAnnotations[i].shape as PointShape).point;
    data[i] = point.x;
    data[numPoints + i] = point.y;
  }

  return {
    width: 2,
    height: numPoints,
    data,
  };
}

/**
 * Convert annotations to H5 JSON string
 *
 * @param annotations - Array of annotations
 * @returns JSON string of H5 data
 */
export function annotationsToH5JSON(annotations: Annotation[]): string {
  const h5Data = annotationsToH5(annotations);
  return JSON.stringify(h5Data, null, 2);
}
