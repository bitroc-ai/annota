/**
 * Annota Loaders - GeoJSON Export
 * Export annotations to GeoJSON format compatible with geospatial tools
 */

import type { Annotation } from '../core/types';

/**
 * GeoJSON Feature structure
 */
interface GeoJSONFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: string;
    coordinates: any; // Can be number[], number[][], number[][][], or number[][][][] depending on geometry type
  };
  properties: {
    objectType: string;
    classification?: {
      name?: string;
      color?: number[];
    };
    [key: string]: any;
  };
}

/**
 * GeoJSON FeatureCollection structure
 */
interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Export annotations to JSON format (GeoJSON specification)
 *
 * Converts Annota annotations to GeoJSON FeatureCollection compatible with
 * geospatial tools and libraries like Leaflet, OpenLayers, etc.
 *
 * @param annotations - Array of annotations to export
 * @returns GeoJSON FeatureCollection object
 *
 * @example
 * ```ts
 * const annotations = annotator.state.store.all();
 * const json = exportJson(annotations);
 *
 * // Download as file
 * const blob = new Blob([JSON.stringify(json, null, 2)], {
 *   type: 'application/geo+json'
 * });
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'annotations.geojson';
 * a.click();
 * ```
 */
export function exportJson(annotations: Annotation[]): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = [];

  for (const annotation of annotations) {
    const feature = annotationToGeoJSONFeature(annotation);
    if (feature) {
      features.push(feature);
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Convert a single annotation to a GeoJSON feature
 */
function annotationToGeoJSONFeature(annotation: Annotation): GeoJSONFeature | null {
  const { id, shape, properties, maskPolarity } = annotation;

  let geometry: GeoJSONFeature['geometry'] | null = null;

  switch (shape.type) {
    case 'point':
      geometry = {
        type: 'Point',
        coordinates: [shape.point.x, shape.point.y],
      };
      break;

    case 'rectangle':
      // Convert rectangle to Polygon (closed ring)
      const { x, y, width, height } = shape;
      geometry = {
        type: 'Polygon',
        coordinates: [[
          [x, y],
          [x + width, y],
          [x + width, y + height],
          [x, y + height],
          [x, y], // Close the ring
        ]],
      };
      break;

    case 'circle':
      // Convert circle to Point with radius property
      // GeoJSON doesn't have native circle support
      geometry = {
        type: 'Point',
        coordinates: [shape.center.x, shape.center.y],
      };
      break;

    case 'polygon':
      // Convert to GeoJSON Polygon
      geometry = {
        type: 'Polygon',
        coordinates: [
          shape.points.map(p => [p.x, p.y]),
        ],
      };
      break;

    case 'freehand':
      // Convert to LineString if not closed, Polygon if closed
      const coords = shape.points.map(p => [p.x, p.y]);
      if (shape.closed) {
        geometry = {
          type: 'Polygon',
          coordinates: [coords],
        };
      } else {
        geometry = {
          type: 'LineString',
          coordinates: coords,
        };
      }
      break;

    case 'multipolygon':
      // Convert to GeoJSON MultiPolygon
      geometry = {
        type: 'MultiPolygon',
        coordinates: shape.polygons.map(polygon =>
          [polygon.map(p => [p.x, p.y])]
        ),
      };
      break;

    default:
      // Unsupported shape type
      return null;
  }

  if (!geometry) {
    return null;
  }

  // Build properties object
  const geoProperties: GeoJSONFeature['properties'] = {
    objectType: 'annotation',
    ...properties,
  };

  // Add classification if category exists
  if (properties?.category) {
    geoProperties.classification = {
      name: properties.category as string,
    };
  }

  // Add mask polarity if present
  if (maskPolarity) {
    geoProperties.maskPolarity = maskPolarity;
  }

  // Add circle radius if it's a circle shape
  if (shape.type === 'circle') {
    geoProperties.radius = shape.radius;
  }

  return {
    type: 'Feature',
    id,
    geometry,
    properties: geoProperties,
  };
}

/**
 * Download annotations as JSON file (GeoJSON format)
 *
 * @param geojson - GeoJSON FeatureCollection to download
 * @param filename - Filename for the download (default: 'annotations.geojson')
 *
 * @example
 * ```ts
 * const annotations = annotator.state.store.all();
 * const json = exportJson(annotations);
 * downloadJson(json, 'my-annotations.geojson');
 * ```
 */
export function downloadJson(
  geojson: GeoJSONFeatureCollection,
  filename: string = 'annotations.geojson'
): void {
  const json = JSON.stringify(geojson, null, 2);
  const blob = new Blob([json], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
}
