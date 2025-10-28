/**
 * Tests for GeoJSON export functionality
 */

import { describe, it, expect } from 'vitest';
import { exportToGeoJSON } from './geojson';
import type { Annotation } from '../core/types';

describe('exportToGeoJSON', () => {
  it('should export empty array as empty FeatureCollection', () => {
    const result = exportToGeoJSON([]);

    expect(result).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
  });

  it('should export point annotation to GeoJSON Point', () => {
    const annotation: Annotation = {
      id: 'point-1',
      shape: {
        type: 'point',
        point: { x: 100, y: 200 },
        bounds: { minX: 100, minY: 200, maxX: 100, maxY: 200 },
      },
      properties: {
        category: 'test',
      },
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0]).toEqual({
      type: 'Feature',
      id: 'point-1',
      geometry: {
        type: 'Point',
        coordinates: [100, 200],
      },
      properties: {
        objectType: 'annotation',
        category: 'test',
        classification: {
          name: 'test',
        },
      },
    });
  });

  it('should export rectangle annotation to GeoJSON Polygon', () => {
    const annotation: Annotation = {
      id: 'rect-1',
      shape: {
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        bounds: { minX: 10, minY: 20, maxX: 40, maxY: 60 },
      },
      properties: {},
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry).toEqual({
      type: 'Polygon',
      coordinates: [[
        [10, 20],
        [40, 20],
        [40, 60],
        [10, 60],
        [10, 20], // Closed ring
      ]],
    });
  });

  it('should export circle annotation to GeoJSON Point with radius property', () => {
    const annotation: Annotation = {
      id: 'circle-1',
      shape: {
        type: 'circle',
        center: { x: 50, y: 60 },
        radius: 25,
        bounds: { minX: 25, minY: 35, maxX: 75, maxY: 85 },
      },
      properties: {},
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry).toEqual({
      type: 'Point',
      coordinates: [50, 60],
    });
    expect(result.features[0].properties.radius).toBe(25);
  });

  it('should export polygon annotation to GeoJSON Polygon', () => {
    const annotation: Annotation = {
      id: 'poly-1',
      shape: {
        type: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      },
      properties: {},
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry).toEqual({
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]],
    });
  });

  it('should export closed freehand annotation to GeoJSON Polygon', () => {
    const annotation: Annotation = {
      id: 'freehand-1',
      shape: {
        type: 'freehand',
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
          { x: 10, y: 0 },
        ],
        closed: true,
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      },
      properties: {},
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry.type).toBe('Polygon');
    expect(result.features[0].geometry.coordinates).toEqual([[
      [0, 0],
      [5, 5],
      [10, 0],
    ]]);
  });

  it('should export open freehand annotation to GeoJSON LineString', () => {
    const annotation: Annotation = {
      id: 'freehand-2',
      shape: {
        type: 'freehand',
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
          { x: 10, y: 10 },
        ],
        closed: false,
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      },
      properties: {},
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry.type).toBe('LineString');
    expect(result.features[0].geometry.coordinates).toEqual([
      [0, 0],
      [5, 5],
      [10, 10],
    ]);
  });

  it('should export multipolygon annotation to GeoJSON MultiPolygon', () => {
    const annotation: Annotation = {
      id: 'multipoly-1',
      shape: {
        type: 'multipolygon',
        polygons: [
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          [
            { x: 20, y: 20 },
            { x: 30, y: 20 },
            { x: 30, y: 30 },
          ],
        ],
        bounds: { minX: 0, minY: 0, maxX: 30, maxY: 30 },
      },
      properties: {},
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry.type).toBe('MultiPolygon');
    expect(result.features[0].geometry.coordinates).toEqual([
      [[
        [0, 0],
        [10, 0],
        [10, 10],
      ]],
      [[
        [20, 20],
        [30, 20],
        [30, 30],
      ]],
    ]);
  });

  it('should include maskPolarity in properties if present', () => {
    const annotation: Annotation = {
      id: 'mask-1',
      shape: {
        type: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      },
      properties: {},
      maskPolarity: 'positive',
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features[0].properties.maskPolarity).toBe('positive');
  });

  it('should include classification if category property exists', () => {
    const annotation: Annotation = {
      id: 'classified-1',
      shape: {
        type: 'point',
        point: { x: 10, y: 20 },
        bounds: { minX: 10, minY: 20, maxX: 10, maxY: 20 },
      },
      properties: {
        category: 'tumor',
      },
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features[0].properties.classification).toEqual({
      name: 'tumor',
    });
  });

  it('should preserve custom properties', () => {
    const annotation: Annotation = {
      id: 'custom-1',
      shape: {
        type: 'point',
        point: { x: 10, y: 20 },
        bounds: { minX: 10, minY: 20, maxX: 10, maxY: 20 },
      },
      properties: {
        customField: 'customValue',
        anotherField: 123,
      },
    };

    const result = exportToGeoJSON([annotation]);

    expect(result.features[0].properties.customField).toBe('customValue');
    expect(result.features[0].properties.anotherField).toBe(123);
    expect(result.features[0].properties.objectType).toBe('annotation');
  });

  it('should export multiple annotations', () => {
    const annotations: Annotation[] = [
      {
        id: 'point-1',
        shape: { type: "point", point: { x: 10, y: 20 }, bounds: { minX: 10, minY: 20, maxX: 10, maxY: 20 } },
        properties: {},
      },
      {
        id: 'rect-1',
        shape: { type: "rectangle", x: 0, y: 0, width: 10, height: 10, bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
        properties: {},
      },
      {
        id: 'poly-1',
        shape: {
          type: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 5 },
            { x: 10, y: 0 },
          ],
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        },
        properties: {},
      },
    ];

    const result = exportToGeoJSON(annotations);

    expect(result.features).toHaveLength(3);
    expect(result.features[0].id).toBe('point-1');
    expect(result.features[1].id).toBe('rect-1');
    expect(result.features[2].id).toBe('poly-1');
  });

  it('should skip annotations with unsupported shape types', () => {
    const annotations: Annotation[] = [
      {
        id: 'point-1',
        shape: { type: "point", point: { x: 10, y: 20 }, bounds: { minX: 10, minY: 20, maxX: 10, maxY: 20 } },
        properties: {},
      },
      {
        id: 'unknown-1',
        shape: { type: "unknown", bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } } as any,
        properties: {},
      },
    ];

    const result = exportToGeoJSON(annotations);

    // Should only include the point annotation, skip the unknown type
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('point-1');
  });
});
