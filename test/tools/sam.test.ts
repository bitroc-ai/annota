import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SamTool } from '../../src/tools/sam';
import { createDummyEmbedding } from '../../src/ml/embedding-utils';

describe('SamTool', () => {
  let tool: SamTool;
  let mockViewer: any;
  let mockAnnotator: any;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Mock OpenSeadragon global
    (window as any).OpenSeadragon = {
      Point: class {
        x: number;
        y: number;
        constructor(x: number, y: number) {
          this.x = x;
          this.y = y;
        }
      }
    };

    // Create mock canvas element
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1024;
    mockCanvas.height = 1024;

    // Create mock container element
    const mockContainer = document.createElement('div');

    // Create mock viewport
    const mockViewport = {
      viewerElementToImageCoordinates: vi.fn((point: any) => point),
      pointFromPixel: vi.fn((point: any) => point),
      viewportToImageCoordinates: vi.fn((point: any) => ({
        x: point.x,
        y: point.y,
      })),
    };

    // Create mock viewer
    mockViewer = {
      addHandler: vi.fn(),
      removeHandler: vi.fn(),
      viewport: mockViewport,
      canvas: mockCanvas,
      element: mockContainer,
    };

    // Create mock annotator with store
    const mockStore = {
      add: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      all: vi.fn(() => []),
    };

    const mockSelection = {
      select: vi.fn(),
    };

    mockAnnotator = {
      state: {
        store: mockStore,
        selection: mockSelection,
      },
      updateAnnotation: vi.fn(),
    };

    // Create SAM tool with dummy embedding
    tool = new SamTool({
      decoderModelUrl: '/models/sam_onnx_quantized_example.onnx',
      embedding: createDummyEmbedding(),
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    tool.init(mockViewer, mockAnnotator);
  });

  it('should initialize with correct ID', () => {
    expect(tool.id).toBe('sam');
  });

  it('should attach mousemove event listener when showHoverPreview is true', () => {
    // Check that addEventListener was called on the container element
    const mockContainer = document.createElement('div');
    const addEventListenerSpy = vi.spyOn(mockContainer, 'addEventListener');

    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    // Reinitialize to trigger event handler attachment
    const testTool = new SamTool({
      decoderModelUrl: '/models/sam_onnx_quantized_example.onnx',
      embedding: createDummyEmbedding(),
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    testTool.init(testViewer, mockAnnotator);

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('should not attach mousemove event listener when showHoverPreview is false', () => {
    const addEventListenerSpy = vi.spyOn(mockCanvas, 'addEventListener');

    // Create tool with showHoverPreview disabled
    const toolNoPreview = new SamTool({
      decoderModelUrl: '/models/sam_onnx_quantized_example.onnx',
      embedding: createDummyEmbedding(),
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: false,
    });

    toolNoPreview.init(mockViewer, mockAnnotator);

    // Should not attach mousemove listener
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('should remove event listeners on destroy', () => {
    // Check that removeEventListener was called on the container element
    const mockContainer = document.createElement('div');
    const removeEventListenerSpy = vi.spyOn(mockContainer, 'removeEventListener');

    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    const testTool = new SamTool({
      decoderModelUrl: '/models/sam_onnx_quantized_example.onnx',
      embedding: createDummyEmbedding(),
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    testTool.init(testViewer, mockAnnotator);
    testTool.destroy();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('should call model initialization', async () => {
    // Mock the underlying model's initialize and isInitialized methods
    const modelMock = (tool as any).model;
    const isInitializedSpy = vi.spyOn(modelMock, 'isInitialized');
    isInitializedSpy.mockReturnValueOnce(false); // First call returns false

    // Initially not initialized
    expect(tool.isModelInitialized()).toBe(false);

    // Now mock for successful initialization
    vi.spyOn(modelMock, 'initialize').mockResolvedValue(undefined);
    isInitializedSpy.mockReturnValue(true); // After init, return true

    // After initialization, should return true
    await tool.initializeModel();
    expect(tool.isModelInitialized()).toBe(true);
  });

  it('should register canvas-click event handler', () => {
    expect(mockViewer.addHandler).toHaveBeenCalledWith(
      'canvas-click',
      expect.any(Function)
    );
  });

  it('should update embedding with setEmbedding', () => {
    const newEmbedding = createDummyEmbedding();
    tool.setEmbedding(newEmbedding, 2048, 2048);

    // Access private property for testing
    const samOptions = (tool as any).samOptions;
    expect(samOptions.embedding).toBe(newEmbedding);
    expect(samOptions.imageWidth).toBe(2048);
    expect(samOptions.imageHeight).toBe(2048);
  });

  it('should run SAM prediction on hover when model is initialized', async () => {
    // Mock the model to be initialized
    const modelMock = (tool as any).model;
    vi.spyOn(modelMock, 'isInitialized').mockReturnValue(true);

    // Mock the predict method to return a result
    const mockMaskBlob = new Blob(['fake mask data'], { type: 'image/png' });
    const predictSpy = vi.spyOn(modelMock, 'predict').mockResolvedValue({
      maskBlob: mockMaskBlob,
      iouScore: 0.95,
    });

    // Create mock container and attach event handlers
    const mockContainer = document.createElement('div');
    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    const testTool = new SamTool({
      decoderModelUrl: '/models/sam_onnx_quantized_example.onnx',
      embedding: createDummyEmbedding(),
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    // Mock the model for this tool as well
    const testModelMock = (testTool as any).model;
    vi.spyOn(testModelMock, 'isInitialized').mockReturnValue(true);
    vi.spyOn(testModelMock, 'predict').mockResolvedValue({
      maskBlob: mockMaskBlob,
      iouScore: 0.95,
    });

    testTool.init(testViewer, mockAnnotator);

    // Simulate mousemove event
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 512,
      clientY: 512,
    });

    // Dispatch event to container
    mockContainer.dispatchEvent(mouseMoveEvent);

    // Wait for async prediction to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that predict was called
    expect(testModelMock.predict).toHaveBeenCalled();
  });

  it('should throttle hover preview updates to 15ms', async () => {
    // Mock the model to be initialized
    const modelMock = (tool as any).model;
    vi.spyOn(modelMock, 'isInitialized').mockReturnValue(true);

    const mockMaskBlob = new Blob(['fake mask data'], { type: 'image/png' });
    const predictSpy = vi.spyOn(modelMock, 'predict').mockResolvedValue({
      maskBlob: mockMaskBlob,
      iouScore: 0.95,
    });

    // Create mock container
    const mockContainer = document.createElement('div');
    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    const testTool = new SamTool({
      decoderModelUrl: '/models/sam_onnx_quantized_example.onnx',
      embedding: createDummyEmbedding(),
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    const testModelMock = (testTool as any).model;
    vi.spyOn(testModelMock, 'isInitialized').mockReturnValue(true);
    const testPredictSpy = vi.spyOn(testModelMock, 'predict').mockResolvedValue({
      maskBlob: mockMaskBlob,
      iouScore: 0.95,
    });

    testTool.init(testViewer, mockAnnotator);

    // Dispatch 3 events in quick succession (< 15ms apart)
    for (let i = 0; i < 3; i++) {
      const event = new MouseEvent('mousemove', {
        clientX: 500 + i,
        clientY: 500 + i,
      });
      mockContainer.dispatchEvent(event);
    }

    // Wait for any async operations
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should only have been called once due to throttling
    expect(testPredictSpy).toHaveBeenCalledTimes(1);
  });
});
