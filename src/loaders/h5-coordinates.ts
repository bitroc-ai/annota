/**
 * Annota Loaders - H5 Coordinate Files
 * Load H5 files containing point coordinates and convert to point annotations
 */

import type { Annotation, PointShape } from '../core/types';

export interface H5CoordinateLoaderOptions {
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  properties?: Record<string, any>;
}

/**
 * Load H5 coordinate file and create point annotations
 * Uses jsfive to read H5 files directly in the browser
 *
 * @param h5Path - Path or URL to the H5 file
 * @param options - Style and property options
 * @returns Array of point annotations
 *
 * @example
 * ```ts
 * const annotations = await loadH5Coordinates('/annotations/image1.h5', {
 *   color: '#FF0000',
 *   fillOpacity: 0.8
 * });
 * annotator.addAnnotations(annotations);
 * ```
 */
export async function loadH5Coordinates(
  h5Path: string,
  options: H5CoordinateLoaderOptions = {}
): Promise<Annotation[]> {
  const { color = '#00FF00', fillOpacity = 0.8, strokeWidth = 2, properties = {} } = options;

  console.log('[loadH5Coordinates] 🎯 CALLED:', { h5Path, color, fillOpacity, strokeWidth });

  try {
    // Dynamically import jsfive (only when needed)
    console.log('[loadH5Coordinates] 📦 Importing jsfive...');
    // @ts-ignore - jsfive doesn't have type definitions
    const { default: hdf5 } = await import('jsfive');
    console.log('[loadH5Coordinates] ✅ jsfive imported');

    // Fetch the H5 file
    console.log('[loadH5Coordinates] 🌐 Fetching:', h5Path);
    const response = await fetch(h5Path);
    console.log('[loadH5Coordinates] 📡 Fetch status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Failed to fetch H5 file: ${h5Path} (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('[loadH5Coordinates] 📦 Buffer size:', arrayBuffer.byteLength, 'bytes');

    const f = new hdf5.File(arrayBuffer);
    console.log('[loadH5Coordinates] ✅ HDF5 file opened');

    // Get the coordinates dataset
    const coords = f.get('coordinates');
    if (!coords) {
      console.error('[loadH5Coordinates] ❌ No coordinates dataset!');
      console.log('[loadH5Coordinates] Available keys:', Object.keys(f));
      throw new Error('No "coordinates" dataset found in H5 file');
    }

    const coordsData = coords.value;
    const shape = coords.shape; // [N, 2] format
    console.log('[loadH5Coordinates] 📊 Shape:', shape, 'Data length:', coordsData?.length);

    if (shape.length !== 2 || shape[1] !== 2) {
      throw new Error(`Invalid coordinate format: expected [N, 2], got [${shape.join(', ')}]`);
    }

    const numPoints = shape[0];
    console.log('[loadH5Coordinates] 🎯 Creating', numPoints, 'point annotations');

    const annotations: Annotation[] = [];

    // jsfive returns data in row-major order: [x0, y0, x1, y1, ...]
    for (let i = 0; i < numPoints; i++) {
      const x = coordsData[i * 2];
      const y = coordsData[i * 2 + 1];

      const shape: PointShape = {
        type: 'point',
        point: { x, y },
        bounds: { minX: x, minY: y, maxX: x, maxY: y },
      };

      annotations.push({
        id: `h5-coord-${i}`,
        shape,
        properties: {
          ...properties,
          source: 'h5-coordinates',
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

    console.log('[loadH5Coordinates] ✅ Created', annotations.length, 'annotations');
    if (annotations.length > 0) {
      console.log(
        '[loadH5Coordinates] 🎨 First annotation:',
        JSON.stringify(annotations[0], null, 2)
      );
    }

    return annotations;
  } catch (error) {
    console.error('[loadH5Coordinates] ❌ ERROR:', error);
    throw error;
  }
}
