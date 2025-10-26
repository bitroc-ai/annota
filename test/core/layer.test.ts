/**
 * Unit tests for Layer Management
 * Tests layer visibility, opacity, and annotation layer assignment
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createLayerManager, isAnnotationVisible, getEffectiveOpacity } from '../../src/core/layer';
import type { Annotation } from '../../src/core/types';
import type { LayerManager } from '../../src/core/layer';

describe('Layer Manager', () => {
  let layerManager: LayerManager;

  beforeEach(() => {
    layerManager = createLayerManager();
  });

  describe('Layer Creation and Retrieval', () => {
    it('should create default and image layers on initialization', () => {
      const layers = layerManager.getAllLayers();
      expect(layers.length).toBe(2);

      const defaultLayer = layerManager.getLayer('default');
      expect(defaultLayer).toBeDefined();
      expect(defaultLayer?.name).toBe('Default');
      expect(defaultLayer?.visible).toBe(true);

      const imageLayer = layerManager.getLayer('image');
      expect(imageLayer).toBeDefined();
      expect(imageLayer?.name).toBe('Image');
      expect(imageLayer?.locked).toBe(true);
    });

    it('should create a new layer', () => {
      const layer = layerManager.createLayer('test', {
        name: 'Test Layer',
        visible: true,
        opacity: 0.8,
        zIndex: 5,
      });

      expect(layer.id).toBe('test');
      expect(layer.name).toBe('Test Layer');
      expect(layer.visible).toBe(true);
      expect(layer.opacity).toBe(0.8);
      expect(layer.zIndex).toBe(5);
    });

    it('should not allow duplicate layer IDs', () => {
      layerManager.createLayer('test', { name: 'Test' });
      expect(() => {
        layerManager.createLayer('test', { name: 'Duplicate' });
      }).toThrow();
    });
  });

  describe('Layer Visibility', () => {
    it('should toggle layer visibility', () => {
      layerManager.createLayer('test', { name: 'Test', visible: true });
      expect(layerManager.isLayerVisible('test')).toBe(true);

      layerManager.setLayerVisibility('test', false);
      expect(layerManager.isLayerVisible('test')).toBe(false);

      layerManager.setLayerVisibility('test', true);
      expect(layerManager.isLayerVisible('test')).toBe(true);
    });

    it('should hide annotations when layer is hidden', () => {
      layerManager.createLayer('masks', {
        name: 'Masks',
        visible: false,
      });

      const annotation: Annotation = {
        id: 'ann1',
        shape: {
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        },
        properties: {
          layer: 'masks',
        },
      };

      expect(isAnnotationVisible(annotation, layerManager)).toBe(false);
    });

    it('should show annotations when layer is visible', () => {
      layerManager.createLayer('masks', {
        name: 'Masks',
        visible: true,
      });

      const annotation: Annotation = {
        id: 'ann1',
        shape: {
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        },
        properties: {
          layer: 'masks',
        },
      };

      expect(isAnnotationVisible(annotation, layerManager)).toBe(true);
    });

    it('should update annotation visibility when layer visibility changes', () => {
      layerManager.createLayer('masks', {
        name: 'Masks',
        visible: false,
      });

      const annotation: Annotation = {
        id: 'ann1',
        shape: {
          type: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 100 },
          ],
          bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        },
        properties: {
          layer: 'masks',
        },
      };

      // Initially hidden
      expect(isAnnotationVisible(annotation, layerManager)).toBe(false);

      // Toggle to visible
      layerManager.setLayerVisibility('masks', true);
      expect(isAnnotationVisible(annotation, layerManager)).toBe(true);

      // Toggle back to hidden
      layerManager.setLayerVisibility('masks', false);
      expect(isAnnotationVisible(annotation, layerManager)).toBe(false);
    });
  });

  describe('Layer Opacity', () => {
    it('should set and retrieve layer opacity', () => {
      layerManager.createLayer('test', { name: 'Test', opacity: 1.0 });

      layerManager.setLayerOpacity('test', 0.5);
      const layer = layerManager.getLayer('test');
      expect(layer?.opacity).toBe(0.5);
    });

    it('should clamp opacity between 0 and 1', () => {
      layerManager.createLayer('test', { name: 'Test', opacity: 1.0 });

      layerManager.setLayerOpacity('test', 1.5);
      expect(layerManager.getLayer('test')?.opacity).toBe(1.0);

      layerManager.setLayerOpacity('test', -0.5);
      expect(layerManager.getLayer('test')?.opacity).toBe(0.0);
    });

    it('should multiply layer opacity with annotation fillOpacity', () => {
      layerManager.createLayer('masks', {
        name: 'Masks',
        opacity: 0.5,
      });

      const annotation: Annotation = {
        id: 'ann1',
        shape: {
          type: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
          bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        },
        properties: {
          layer: 'masks',
        },
        style: {
          fillOpacity: 0.3,
        },
      };

      const effectiveOpacity = getEffectiveOpacity(annotation, layerManager);
      expect(effectiveOpacity).toBe(0.15); // 0.5 * 0.3
    });
  });

  describe('Layer Assignment', () => {
    it('should assign annotation to layer via properties.layer', () => {
      layerManager.createLayer('masks', { name: 'Masks' });

      const annotation: Annotation = {
        id: 'ann1',
        shape: {
          type: 'point',
          point: { x: 50, y: 50 },
          bounds: { minX: 50, minY: 50, maxX: 50, maxY: 50 },
        },
        properties: {
          layer: 'masks',
        },
      };

      const layer = layerManager.getLayerForAnnotation(annotation);
      expect(layer?.id).toBe('masks');
    });

    it('should fall back to default layer if no layer specified', () => {
      const annotation: Annotation = {
        id: 'ann1',
        shape: {
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        },
        properties: {},
      };

      const layer = layerManager.getLayerForAnnotation(annotation);
      expect(layer?.id).toBe('default');
    });

    it('should use layer filter if no explicit layer property', () => {
      layerManager.createLayer('positive', {
        name: 'Positive',
        filter: (ann) => ann.properties?.category === 'positive',
      });

      const annotation: Annotation = {
        id: 'ann1',
        shape: {
          type: 'point',
          point: { x: 10, y: 10 },
          bounds: { minX: 10, minY: 10, maxX: 10, maxY: 10 },
        },
        properties: {
          category: 'positive',
        },
      };

      const layer = layerManager.getLayerForAnnotation(annotation);
      expect(layer?.id).toBe('positive');
    });
  });

  describe('Layer Locking', () => {
    it('should toggle layer lock state', () => {
      layerManager.createLayer('test', { name: 'Test', locked: false });
      expect(layerManager.isLayerLocked('test')).toBe(false);

      layerManager.setLayerLocked('test', true);
      expect(layerManager.isLayerLocked('test')).toBe(true);
    });

    it('should not allow deleting default or image layers', () => {
      layerManager.deleteLayer('default');
      expect(layerManager.getLayer('default')).toBeDefined();

      layerManager.deleteLayer('image');
      expect(layerManager.getLayer('image')).toBeDefined();
    });
  });

  describe('Layer Observers', () => {
    it('should notify observers when layer is created', () => {
      let notified = false;
      layerManager.observe(() => {
        notified = true;
      });

      layerManager.createLayer('test', { name: 'Test' });
      expect(notified).toBe(true);
    });

    it('should notify observers when layer is updated', () => {
      let notified = false;
      layerManager.createLayer('test', { name: 'Test' });

      layerManager.observe(() => {
        notified = true;
      });

      layerManager.setLayerVisibility('test', false);
      expect(notified).toBe(true);
    });
  });
});
