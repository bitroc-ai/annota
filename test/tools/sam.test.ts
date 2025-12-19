import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SamTool } from '../../src/tools/sam';
import type { SamPredictFn, SamPredictInput, SamPredictOutput, MaskStats } from '../../src/tools/sam';

/**
 * Create a mock predict function for testing
 */
function createMockPredictFn(): SamPredictFn {
  return vi.fn(async (input: SamPredictInput): Promise<SamPredictOutput> => {
    const mockMaskStats: MaskStats = {
      width: input.imageWidth,
      height: input.imageHeight,
      numMasks: 1,
      whiteCount: 1000,
      blackCount: input.imageWidth * input.imageHeight - 1000,
      foregroundRatio: 1000 / (input.imageWidth * input.imageHeight),
      isEmpty: false,
      isTiny: false,
      iouBestIndex: 0,
      iouBestScore: 0.95,
    };

    // Return a minimal PNG blob for testing
    const mockPngData = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      // Minimal IHDR chunk
      0x00, 0x00, 0x00, 0x0d, // length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width = 1
      0x00, 0x00, 0x00, 0x01, // height = 1
      0x08, 0x00, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x3a, 0x7e, 0x9b, 0x55, // CRC
      // Minimal IDAT chunk
      0x00, 0x00, 0x00, 0x0a, // length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x78, 0x9c, 0x62, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
      0x73, 0x75, 0x01, 0x18, // CRC
      // IEND chunk
      0x00, 0x00, 0x00, 0x00, // length
      0x49, 0x45, 0x4e, 0x44, // IEND
      0xae, 0x42, 0x60, 0x82, // CRC
    ]);

    const mockMaskBlob = new Blob([mockPngData], { type: 'image/png' });

    return {
      maskBlob: mockMaskBlob,
      iouScore: 0.95,
      maskStats: mockMaskStats,
    };
  });
}

describe('SamTool', () => {
  let tool: SamTool;
  let mockViewer: any;
  let mockAnnotator: any;
  let mockCanvas: HTMLCanvasElement;
  let mockPredictFn: SamPredictFn;

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

    // Create mock predict function
    mockPredictFn = createMockPredictFn();

    // Create SAM tool with mock predict function
    tool = new SamTool({
      predictFn: mockPredictFn,
      embedding: '/embeddings/test.npy',
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

  it('should throw error if predictFn is not provided', () => {
    expect(() => {
      new SamTool({
        imageWidth: 1024,
        imageHeight: 1024,
      } as any);
    }).toThrow('SamTool requires a predictFn for inference');
  });

  it('should attach mousemove event listener when showHoverPreview is true', () => {
    // Check that addEventListener was called on the container element
    const mockContainer = document.createElement('div');
    const addEventListenerSpy = vi.spyOn(mockContainer, 'addEventListener');

    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    // Create a new mock predict function for this test
    const testPredictFn = createMockPredictFn();

    const testTool = new SamTool({
      predictFn: testPredictFn,
      embedding: '/embeddings/test.npy',
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    testTool.init(testViewer, mockAnnotator);

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('should not attach mousemove event listener when showHoverPreview is false', () => {
    const mockContainer = document.createElement('div');
    const addEventListenerSpy = vi.spyOn(mockContainer, 'addEventListener');

    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    // Create tool with showHoverPreview disabled
    const toolNoPreview = new SamTool({
      predictFn: createMockPredictFn(),
      embedding: '/embeddings/test.npy',
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: false,
    });

    toolNoPreview.init(testViewer, mockAnnotator);

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
      predictFn: createMockPredictFn(),
      embedding: '/embeddings/test.npy',
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    testTool.init(testViewer, mockAnnotator);
    testTool.destroy();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('should mark as initialized after initializeModel', async () => {
    // Initially not initialized
    expect(tool.isModelInitialized()).toBe(false);

    // After initialization
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
    const newEmbedding = '/embeddings/new-test.npy';
    tool.setEmbedding(newEmbedding, 2048, 2048);

    // Access private property for testing
    const samOptions = (tool as any).samOptions;
    expect((tool as any).embeddingData).toBe(newEmbedding);
    expect(samOptions.imageWidth).toBe(2048);
    expect(samOptions.imageHeight).toBe(2048);
  });

  it('should call predictFn on hover when model is initialized', async () => {
    // Create mock container and attach event handlers
    const mockContainer = document.createElement('div');
    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    const testPredictFn = createMockPredictFn();

    const testTool = new SamTool({
      predictFn: testPredictFn,
      embedding: '/embeddings/test.npy',
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    testTool.init(testViewer, mockAnnotator);
    await testTool.initializeModel(); // Must initialize first

    // Simulate mousemove event
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 512,
      clientY: 512,
    });

    // Dispatch event to container
    mockContainer.dispatchEvent(mouseMoveEvent);

    // Wait for async prediction to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    // Check that predictFn was called
    expect(testPredictFn).toHaveBeenCalled();
  });

  it('should throttle hover preview updates to 100ms', async () => {
    // Create mock container
    const mockContainer = document.createElement('div');
    const testViewer = {
      ...mockViewer,
      element: mockContainer,
    };

    const testPredictFn = createMockPredictFn();

    const testTool = new SamTool({
      predictFn: testPredictFn,
      embedding: '/embeddings/test.npy',
      imageWidth: 1024,
      imageHeight: 1024,
      showHoverPreview: true,
      previewOpacity: 0.4,
    });

    testTool.init(testViewer, mockAnnotator);
    await testTool.initializeModel(); // Must initialize first

    // Dispatch 3 events in quick succession (< 100ms apart)
    for (let i = 0; i < 3; i++) {
      const event = new MouseEvent('mousemove', {
        clientX: 500 + i,
        clientY: 500 + i,
      });
      mockContainer.dispatchEvent(event);
    }

    // Wait for any async operations
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should only have been called once due to throttling
    expect(testPredictFn).toHaveBeenCalledTimes(1);
  });

  it('should support Float32Array embedding', () => {
    const embeddingArray = new Float32Array(256 * 64 * 64);
    const testTool = new SamTool({
      predictFn: createMockPredictFn(),
      embedding: embeddingArray,
      imageWidth: 1024,
      imageHeight: 1024,
    });

    expect((testTool as any).embeddingData).toBe(embeddingArray);
  });

  it('should support string path embedding', () => {
    const embeddingPath = '/path/to/embedding.npy';
    const testTool = new SamTool({
      predictFn: createMockPredictFn(),
      embedding: embeddingPath,
      imageWidth: 1024,
      imageHeight: 1024,
    });

    expect((testTool as any).embeddingData).toBe(embeddingPath);
  });
});
