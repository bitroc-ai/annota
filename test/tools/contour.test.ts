import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContourTool } from '../../src/tools/contour';
import * as opencv from '../../src/extensions/opencv';

// Mock OpenCV module
vi.mock('../../src/extensions/opencv', () => ({
  isOpenCVReady: vi.fn(),
  initOpenCV: vi.fn(),
  detectContour: vi.fn(),
}));

describe('ContourTool', () => {
  let tool: ContourTool;
  let mockViewer: any;
  let mockAnnotator: any;
  let mockCanvas: any;
  let mockContext: any;

  beforeEach(() => {
    // Create mock canvas and context (jsdom doesn't fully implement canvas)
    mockContext = {
      getImageData: vi.fn(() => {
        const data = new Uint8ClampedArray(500 * 500 * 4);
        return { data, width: 500, height: 500 };
      }),
    };

    mockCanvas = {
      width: 1000,
      height: 1000,
      getContext: vi.fn(() => mockContext),
    };

    // Create mock tiled image
    const mockTiledImage = {
      viewportToImageCoordinates: vi.fn((point: any) => ({
        x: point.x * 1000,
        y: point.y * 1000,
      })),
    };

    // Create mock viewer
    mockViewer = {
      addHandler: vi.fn(),
      removeHandler: vi.fn(),
      viewport: {
        viewerElementToImageCoordinates: vi.fn((point: any) => point),
        pointFromPixel: vi.fn((point: any) => ({
          x: point.x / 1000,
          y: point.y / 1000,
        })),
      },
      canvas: mockCanvas,
      drawer: {
        canvas: mockCanvas,
      },
      world: {
        getItemAt: vi.fn(() => mockTiledImage),
      },
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

    // Reset OpenCV mocks
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(false);
    vi.mocked(opencv.initOpenCV).mockResolvedValue(true);
    vi.mocked(opencv.detectContour).mockReturnValue(null);

    // Create tool with test options
    tool = new ContourTool({
      cv: {} as any,
      tileSource: 'test.jpg',
      threshold: 50,
    });
    tool.init(mockViewer as any, mockAnnotator as any);
  });

  it('should initialize with correct default state', () => {
    expect(tool.id).toBe('contour');
    expect(tool.enabled).toBe(true);
  });

  it('should register event handlers on init', () => {
    expect(mockViewer.addHandler).toHaveBeenCalledWith('canvas-click', expect.any(Function));
  });

  it('should handle canvas-click event through OpenSeadragon', async () => {
    // OpenCV ready
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(true);

    // Mock successful detection
    const detectedPolygon = [
      { x: 10, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 50 },
      { x: 10, y: 50 },
    ];
    vi.mocked(opencv.detectContour).mockReturnValue({
      polygon: detectedPolygon,
      confidence: 0.85,
      area: 1600,
      metadata: {
        mask: { data: new Uint8ClampedArray(100 * 100 * 4), width: 100, height: 100 } as ImageData,
        isWithinConstraints: true,
      },
    });

    // Mock getImageData
    const mockImageData = { data: new Uint8ClampedArray(500 * 500 * 4), width: 500, height: 500 } as ImageData;
    mockContext.getImageData.mockReturnValue(mockImageData);

    // Get the registered handler from addHandler call
    const addHandlerCall = mockViewer.addHandler.mock.calls.find((call: any[]) => call[0] === 'canvas-click');
    expect(addHandlerCall).toBeDefined();
    const registeredHandler = addHandlerCall![1];

    // Simulate OpenSeadragon firing the event
    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await registeredHandler(clickEvent);

    // Should create annotation
    expect(mockAnnotator.state.store.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('contour-'),
        shape: expect.objectContaining({
          type: 'polygon',
          points: expect.any(Array),
        }),
        properties: expect.objectContaining({
          type: 'contour',
          area: 1600,
          confidence: 0.85,
        }),
      })
    );
  });

  it('should initialize OpenCV on construction', () => {
    expect(opencv.initOpenCV).toHaveBeenCalled();
  });

  it('should allow threshold to be updated', () => {
    tool.setThreshold(75);
    // We can't directly test the internal state, but we can verify it doesn't throw
    expect(() => tool.setThreshold(75)).not.toThrow();
  });

  it('should warn and return early if OpenCV not ready', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // OpenCV not ready
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(false);

    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await tool.onCanvasClick(clickEvent as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('OpenCV not ready')
    );
    expect(mockAnnotator.state.store.add).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should not detect when clicking existing annotation', async () => {
    // Clear previous mock calls
    vi.mocked(opencv.detectContour).mockClear();
    mockAnnotator.state.store.add.mockClear();

    // OpenCV ready
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(true);

    // Mock existing annotation that will be hit
    const existingAnnotation = {
      id: 'existing-1',
      shape: {
        type: 'polygon',
        bounds: { minX: 50, minY: 50, maxX: 150, maxY: 150 },
      },
    };
    mockAnnotator.state.store.all.mockReturnValue([existingAnnotation]);

    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await tool.onCanvasClick(clickEvent as any);

    // Should not call detectContour since we hit existing annotation
    expect(opencv.detectContour).not.toHaveBeenCalled();
    expect(mockAnnotator.state.store.add).not.toHaveBeenCalled();
  });

  it('should detect and create annotation when clicking empty area', async () => {
    // OpenCV ready
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(true);

    // Mock successful detection
    const detectedPolygon = [
      { x: 10, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 50 },
      { x: 10, y: 50 },
    ];
    vi.mocked(opencv.detectContour).mockReturnValue({
      polygon: detectedPolygon,
      confidence: 0.85,
      area: 1600,
      metadata: {
        mask: { data: new Uint8ClampedArray(100 * 100 * 4), width: 100, height: 100 } as ImageData,
        isWithinConstraints: true,
      },
    });

    // Mock getImageData
    const mockImageData = { data: new Uint8ClampedArray(500 * 500 * 4), width: 500, height: 500 } as ImageData;
    mockContext.getImageData.mockReturnValue(mockImageData);

    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await tool.onCanvasClick(clickEvent as any);

    // Should call detectContour with correct parameters
    expect(opencv.detectContour).toHaveBeenCalledWith(
      expect.objectContaining({ width: 500, height: 500 }),
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      expect.objectContaining({ threshold: 50 })
    );

    // Should create annotation
    expect(mockAnnotator.state.store.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('contour-'),
        shape: expect.objectContaining({
          type: 'polygon',
          points: expect.any(Array),
        }),
        properties: expect.objectContaining({
          type: 'contour',
          area: 1600,
          confidence: 0.85,
        }),
      })
    );
  });

  it('should handle detection failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // OpenCV ready but detection fails
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(true);
    vi.mocked(opencv.detectContour).mockReturnValue(null);

    // Mock getImageData (already set in beforeEach, but can verify it's called)
    const mockImageData = { data: new Uint8ClampedArray(500 * 500 * 4), width: 500, height: 500 } as ImageData;
    mockContext.getImageData.mockReturnValue(mockImageData);

    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await tool.onCanvasClick(clickEvent as any);

    // Should warn about no detection
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No contour detected')
    );

    // Should not create annotation
    expect(mockAnnotator.state.store.add).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle errors during detection', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // OpenCV ready but throws error
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(true);
    vi.mocked(opencv.detectContour).mockImplementation(() => {
      throw new Error('OpenCV processing error');
    });

    // Mock getImageData
    const mockImageData = { data: new Uint8ClampedArray(500 * 500 * 4), width: 500, height: 500 } as ImageData;
    mockContext.getImageData.mockReturnValue(mockImageData);

    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await tool.onCanvasClick(clickEvent as any);

    // Should log error
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error during contour detection'),
      expect.any(Error)
    );

    // Should not create annotation
    expect(mockAnnotator.state.store.add).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should correctly extract region around click point', async () => {
    // OpenCV ready
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(true);

    // Mock getImageData to verify region extraction
    const mockImageData = { data: new Uint8ClampedArray(500 * 500 * 4), width: 500, height: 500 } as ImageData;
    mockContext.getImageData.mockReturnValue(mockImageData);

    const clickEvent = {
      originalEvent: { offsetX: 300, offsetY: 300 },
      preventDefaultAction: false,
    };

    await tool.onCanvasClick(clickEvent as any);

    // Should extract 500x500 region centered on click (accounting for device pixel ratio)
    const pixelRatio = window.devicePixelRatio || 1;
    const canvasX = Math.floor(300 * pixelRatio);
    const canvasY = Math.floor(300 * pixelRatio);
    const regionSize = 500;
    const halfSize = regionSize / 2;
    const regionX = Math.max(0, Math.floor(canvasX - halfSize));
    const regionY = Math.max(0, Math.floor(canvasY - halfSize));

    expect(mockContext.getImageData).toHaveBeenCalledWith(
      regionX,
      regionY,
      expect.any(Number), // width might be clamped
      expect.any(Number)  // height might be clamped
    );
  });

  it('should pass threshold to detection function', async () => {
    // OpenCV ready
    vi.mocked(opencv.isOpenCVReady).mockReturnValue(true);

    // Update threshold
    tool.setThreshold(75);

    // Mock getImageData
    const mockImageData = { data: new Uint8ClampedArray(500 * 500 * 4), width: 500, height: 500 } as ImageData;
    mockContext.getImageData.mockReturnValue(mockImageData);

    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await tool.onCanvasClick(clickEvent as any);

    // Should pass updated threshold
    expect(opencv.detectContour).toHaveBeenCalledWith(
      expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
      expect.any(Object),
      expect.objectContaining({ threshold: 75 })
    );
  });

  it('should support custom detector function', async () => {
    // Reset OpenCV mock before testing custom detector
    vi.mocked(opencv.detectContour).mockClear();

    // Create custom detector
    const customDetector = vi.fn().mockResolvedValue({
      polygon: [
        { x: 20, y: 20 },
        { x: 60, y: 20 },
        { x: 60, y: 60 },
        { x: 20, y: 60 },
      ],
      confidence: 0.95,
      area: 1600,
      metadata: {
        algorithm: 'custom',
        customProp: 'test',
      },
    });

    // Create tool with custom detector
    const customTool = new ContourTool({
      detector: customDetector,
      threshold: 100,
      detectorOptions: { customOption: 'value' },
    });
    customTool.init(mockViewer as any, mockAnnotator as any);

    // Mock getImageData
    const mockImageData = { data: new Uint8ClampedArray(500 * 500 * 4), width: 500, height: 500 } as ImageData;
    mockContext.getImageData.mockReturnValue(mockImageData);

    const clickEvent = {
      originalEvent: { offsetX: 100, offsetY: 100 },
      preventDefaultAction: false,
    };

    await customTool.onCanvasClick(clickEvent as any);

    // Should call custom detector
    expect(customDetector).toHaveBeenCalledWith(
      expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      expect.objectContaining({
        threshold: 100,
        customOption: 'value',
      })
    );

    // Should not call default OpenCV detector
    expect(opencv.detectContour).not.toHaveBeenCalled();

    // Should create annotation with custom metadata
    expect(mockAnnotator.state.store.add).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          algorithm: 'custom',
          customProp: 'test',
        }),
      })
    );
  });
});
