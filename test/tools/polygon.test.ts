import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolygonTool } from '../../src/tools/polygon';
import type { Point } from '../../src/core/types';

describe('PolygonTool', () => {
  let tool: PolygonTool;
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
      },
      updateAnnotation: vi.fn(),
    };

    tool = new PolygonTool();
    tool.init(mockViewer, mockAnnotator);
  });

  it('should initialize with correct default state', () => {
    expect(tool.id).toBe('polygon');
    expect(tool.enabled).toBe(true);
  });

  it('should register event handlers on init', () => {
    expect(mockViewer.addHandler).toHaveBeenCalledWith(
      'canvas-click',
      expect.any(Function)
    );
  });

  it('should add first vertex and create annotation on click', () => {
    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    tool.onCanvasClick(clickEvent as any);

    expect(mockAnnotator.state.store.add).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: expect.objectContaining({
          type: 'polygon',
          points: expect.arrayContaining([
            expect.objectContaining({ x: 100, y: 100 }),
          ]),
        }),
      })
    );
  });

  it('should update annotation with preview point on mouse move', () => {
    // First, add a vertex by clicking
    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };
    tool.onCanvasClick(clickEvent as any);

    // Mock that the annotation was added
    const annotationId = mockAnnotator.state.store.add.mock.calls[0][0].id;
    mockAnnotator.state.store.get.mockReturnValue({
      id: annotationId,
      shape: { type: 'polygon', points: [{ x: 100, y: 100 }] },
    });

    // Now move the mouse by dispatching a pointermove event
    const canvas = mockViewer.canvas;
    const moveEvent = new PointerEvent('pointermove', {
      clientX: 200,
      clientY: 200,
    });
    Object.defineProperty(moveEvent, 'offsetX', { value: 200 });
    Object.defineProperty(moveEvent, 'offsetY', { value: 200 });
    canvas.dispatchEvent(moveEvent);

    // Should update the annotation with the preview point
    expect(mockAnnotator.updateAnnotation).toHaveBeenCalledWith(
      annotationId,
      expect.objectContaining({
        shape: expect.objectContaining({
          points: expect.arrayContaining([
            { x: 100, y: 100 }, // Original point
            { x: 200, y: 200 }, // Preview point
          ]),
        }),
      })
    );
  });

  it('should not update annotation when not drawing', () => {
    // Dispatch pointermove event when not drawing
    const canvas = mockViewer.canvas;
    const moveEvent = new PointerEvent('pointermove', {
      clientX: 200,
      clientY: 200,
    });
    Object.defineProperty(moveEvent, 'offsetX', { value: 200 });
    Object.defineProperty(moveEvent, 'offsetY', { value: 200 });
    canvas.dispatchEvent(moveEvent);

    // Should not update annotation since we're not drawing
    expect(mockAnnotator.updateAnnotation).not.toHaveBeenCalled();
  });

  it('should only create one annotation for multiple vertices', () => {
    // Use fake timers to control time-based logic
    vi.useFakeTimers();

    // Mock store.get to return the annotation that was added
    let storedAnnotation: any = null;
    mockAnnotator.state.store.add.mockImplementation((ann: any) => {
      storedAnnotation = ann;
    });
    mockAnnotator.state.store.get.mockImplementation((id: string) => {
      return storedAnnotation?.id === id ? storedAnnotation : null;
    });

    // Add first vertex
    const firstClick = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };
    tool.onCanvasClick(firstClick as any);

    // Should have created one annotation
    expect(mockAnnotator.state.store.add).toHaveBeenCalledTimes(1);

    // Wait to avoid double-click threshold (300ms)
    vi.advanceTimersByTime(350);

    // Add second vertex (should update, not add)
    const secondClick = {
      originalEvent: { offsetX: 200, offsetY: 200 },
      preventDefaultAction: false,
    };
    tool.onCanvasClick(secondClick as any);

    // Still only 1 add call, but updateAnnotation should be called
    expect(mockAnnotator.state.store.add).toHaveBeenCalledTimes(1);
    expect(mockAnnotator.updateAnnotation).toHaveBeenCalled();

    // Add third vertex
    const thirdClick = {
      originalEvent: { offsetX: 150, offsetY: 250 },
      preventDefaultAction: false,
    };
    tool.onCanvasClick(thirdClick as any);

    // Should still have only created one annotation
    expect(mockAnnotator.state.store.add).toHaveBeenCalledTimes(1);

    // Restore real timers
    vi.useRealTimers();
  });
});
