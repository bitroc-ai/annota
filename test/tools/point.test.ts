import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PointTool } from '../../src/tools/point';
import type { Annotation } from '../../src/core/types';

describe('PointTool', () => {
  let tool: PointTool;
  let mockViewer: any;
  let mockAnnotator: any;

  beforeEach(() => {
    // Create mock canvas element
    const mockCanvas = document.createElement('canvas');

    // Create mock viewer
    mockViewer = {
      addHandler: vi.fn(),
      removeHandler: vi.fn(),
      viewport: {
        viewerElementToImageCoordinates: vi.fn((point: any) => point),
        getZoom: vi.fn(() => 1),
      },
      canvas: mockCanvas,
    };

    // Create mock annotator with store
    const mockStore = {
      add: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      all: vi.fn(() => []),
    };

    mockAnnotator = {
      state: {
        store: mockStore,
        layerManager: {
            getLayerForAnnotation: vi.fn(() => ({ visible: true, locked: false })),
        }
      },
      addAnnotation: vi.fn((annotation) => mockStore.add(annotation)),
      setSelected: vi.fn(),
    };

    tool = new PointTool();
    tool.init(mockViewer, mockAnnotator);
  });

  it('should initialize with correct default state', () => {
    expect(tool.id).toBe('point');
    expect(tool.enabled).toBe(true);
  });

  it('should register event handlers on init', () => {
    expect(mockViewer.addHandler).toHaveBeenCalledWith(
      'canvas-click',
      expect.any(Function)
    );
  });

  it('should prevent panning on press', () => {
    const pressEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    tool.onCanvasPress(pressEvent as any);

    expect((pressEvent as any).preventDefaultAction).toBe(true);
  });

  it('should create annotation on click', () => {
    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    tool.onCanvasClick(clickEvent as any);

    expect(mockAnnotator.state.store.add).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: expect.objectContaining({
          type: 'point',
          point: expect.objectContaining({ x: 100, y: 100 }),
        }),
      })
    );
    
    // Should verify preventDefaultAction was set
    expect((clickEvent as any).preventDefaultAction).toBe(true);
  });

  it('should not create annotation if hit existing annotation', () => {
    // Setup existing annotation at click location
    const existingAnnotation: Annotation = {
      id: 'existing-1',
      shape: {
        type: 'point',
        point: { x: 100, y: 100 },
        bounds: { minX: 100, minY: 100, maxX: 100, maxY: 100 }
      },
      style: {},
      properties: {}
    };
    
    mockAnnotator.state.store.all.mockReturnValue([existingAnnotation]);
    
    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    tool.onCanvasClick(clickEvent as any);

    // Should NOT add new annotation
    expect(mockAnnotator.state.store.add).not.toHaveBeenCalled();
    
    // Should still prevent default action (to stop OSD zoom)
    expect((clickEvent as any).preventDefaultAction).toBe(true);
  });
});
