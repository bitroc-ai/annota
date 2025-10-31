/**
 * Example: Using Image Shape for Pathology Analysis Results
 *
 * This example demonstrates how to create image annotations for displaying
 * pathology analysis results (e.g., AI model predictions, heatmaps, masks)
 * overlaid on specific regions of a whole slide image.
 */

import type { Annotation, ImageShape } from '../src/core/types';

/**
 * Create an image annotation for a pathology analysis result
 *
 * Workflow:
 * 1. User selects a 640x640 ROI on the slide
 * 2. Backend analyzes the region (AI model inference)
 * 3. Returns JSON metadata + base64 image (mask/heatmap)
 * 4. Create persistent image annotation
 */
export function createAnalysisAnnotation(
  roiX: number,
  roiY: number,
  width: number,
  height: number,
  analysisImageBase64: string,
  metadata: Record<string, any>
): Annotation {
  // Create image shape
  const shape: ImageShape = {
    type: 'image',
    x: roiX,
    y: roiY,
    width: width,
    height: height,
    url: analysisImageBase64, // e.g., "data:image/png;base64,iVBORw0KG..."
    opacity: 0.6, // Semi-transparent overlay
    bounds: {
      minX: roiX,
      minY: roiY,
      maxX: roiX + width,
      maxY: roiY + height,
    },
  };

  // Create annotation with analysis metadata
  const annotation: Annotation = {
    id: `analysis-${Date.now()}`,
    shape,
    properties: {
      analysisType: metadata.analysisType || 'unknown',
      timestamp: Date.now(),
      results: metadata, // Store full analysis results
      // Example metadata:
      // {
      //   analysisType: 'cell_detection',
      //   cellCount: 142,
      //   confidence: 0.95,
      //   modelVersion: 'v2.1.0'
      // }
    },
    style: {
      // Optional: additional styling (fillOpacity applied to sprite)
      fillOpacity: 0.6,
    },
  };

  return annotation;
}

/**
 * Example usage in a React component
 */
export function ExampleUsage() {
  // After user clicks "Analyze" button
  async function handleAnalyze(roiX: number, roiY: number) {
    // 1. Call backend API
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        slideId: 'slide-123',
        x: roiX,
        y: roiY,
        width: 640,
        height: 640,
      }),
    });

    const result = await response.json();
    // result = {
    //   image: "data:image/png;base64,iVBORw0KG...",
    //   metadata: {
    //     analysisType: 'tumor_detection',
    //     tumorProbability: 0.87,
    //     cellCount: 156,
    //   }
    // }

    // 2. Create image annotation
    const annotation = createAnalysisAnnotation(
      roiX,
      roiY,
      640,
      640,
      result.image,
      result.metadata
    );

    // 3. Add to annotator
    // annotator.state.store.add(annotation);

    return annotation;
  }

  return { handleAnalyze };
}

/**
 * Example: Creating a simple test image annotation
 */
export function createTestImageAnnotation(): Annotation {
  // 1x1 red pixel as base64 PNG
  const redPixelBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

  return createAnalysisAnnotation(
    1000, // x
    1000, // y
    640,  // width
    640,  // height
    redPixelBase64,
    {
      analysisType: 'test',
      note: 'This is a test image annotation',
    }
  );
}

/**
 * Notes:
 *
 * 1. Image Data Format:
 *    - Base64 data URL: "data:image/png;base64,..."
 *    - Supports PNG, JPEG, WebP, etc.
 *    - For analysis masks, PNG is recommended (lossless)
 *
 * 2. Performance:
 *    - PixiJS handles texture caching automatically
 *    - Viewport culling works with image shapes
 *    - Sprites are cleaned up when annotations are deleted
 *
 * 3. Interaction:
 *    - Image annotations are selectable (click within bounds)
 *    - Can be dragged to reposition (BODY handle)
 *    - Selected images show purple dashed outline
 *    - Can be deleted like other shapes
 *    - Metadata is accessible via properties
 *    - Size is fixed (represents analysis output dimensions)
 *
 * 4. Rendering:
 *    - Images are rendered as PixiJS sprites (not graphics)
 *    - Opacity controlled via shape.opacity or style.fillOpacity
 *    - Z-order controlled via layers
 */
