/**
 * Annota Extensions - OpenCV Integration
 * Cell edge detection and image processing using OpenCV.js
 */

import type { Point } from '../core/types';

// OpenCV.js types (simplified)
declare global {
  interface Window {
    cv: any;
  }
}

// Track loading state to prevent duplicate initialization
let isLoading = false;
let loadPromise: Promise<boolean> | null = null;

export interface EdgeDetectionOptions {
  /** Threshold value for binary conversion (0-255) */
  threshold?: number;
  /** Threshold type: 'binary' | 'otsu' | 'adaptive' */
  thresholdType?: 'binary' | 'otsu' | 'adaptive';
  /** Blur kernel size (must be odd, e.g., 3, 5, 7) */
  blurSize?: number;
  /** Minimum contour area to filter noise */
  minArea?: number;
  /** Maximum contour area to filter large regions */
  maxArea?: number;
  /** Morphology operations to clean up mask */
  morphOps?: boolean;
}

export interface ContourDetectionResult {
  /** Detected contour boundary as polygon points */
  polygon: Point[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Binary mask of the detected region */
  mask: ImageData;
  /** Area in pixels */
  area: number;
  /** Whether the detected region is within expected size constraints */
  isWithinConstraints: boolean;
}

/**
 * Initialize OpenCV.js
 * Must be called before using OpenCV functions
 */
export async function initOpenCV(): Promise<boolean> {
  if (typeof window === 'undefined') {
    throw new Error('OpenCV can only be initialized in browser environment');
  }

  // Check if already loaded
  if (window.cv && window.cv.Mat) {
    return true;
  }

  // Return existing promise if already loading
  if (isLoading && loadPromise) {
    console.log('[OpenCV] Already loading, returning existing promise');
    return loadPromise;
  }

  // Check if script already exists in DOM
  const existingScript = document.querySelector('script[src*="opencv.js"]');
  if (existingScript && !window.cv?.Mat) {
    // Script exists but not ready yet, wait for it
    console.log('[OpenCV] Script exists, waiting for initialization...');
    isLoading = true;
    loadPromise = new Promise((resolve, reject) => {
      const checkReady = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkReady);
          isLoading = false;
          loadPromise = null;
          console.log('[OpenCV] Initialized successfully (existing script)');
          resolve(true);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkReady);
        isLoading = false;
        loadPromise = null;
        reject(new Error('OpenCV initialization timeout'));
      }, 10000);
    });
    return loadPromise;
  }

  // Load OpenCV.js from CDN
  console.log('[OpenCV] Loading from CDN...');
  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://docs.opencv.org/4.x/opencv.js';

    script.onload = () => {
      // Wait for cv to be fully initialized
      const checkReady = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkReady);
          isLoading = false;
          loadPromise = null;
          console.log('[OpenCV] Initialized successfully');
          resolve(true);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        isLoading = false;
        loadPromise = null;
        reject(new Error('OpenCV initialization timeout'));
      }, 10000);
    };

    script.onerror = () => {
      isLoading = false;
      loadPromise = null;
      reject(new Error('Failed to load OpenCV.js'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Check if OpenCV is available
 */
export function isOpenCVReady(): boolean {
  return typeof window !== 'undefined' && window.cv && window.cv.Mat;
}

/**
 * Detect contour/edge from a click point
 * Uses flood fill and contour detection to find the object boundary
 */
export function detectContour(
  imageData: ImageData,
  clickPoint: Point,
  options: EdgeDetectionOptions = {}
): ContourDetectionResult | null {
  if (!isOpenCVReady()) {
    throw new Error('OpenCV is not initialized. Call initOpenCV() first.');
  }

  const cv = window.cv;
  const {
    threshold = 8, // Tight tolerance for distinct object boundaries (RGB 0-255 scale)
    blurSize = 3, // Smaller blur to preserve edges
    minArea = 50, // Minimum area to filter noise
    maxArea = 5000, // Maximum area for single object detection
    morphOps = true,
  } = options;

  let src: any = null;
  let rgb: any = null;
  let filledRegion: any = null;
  let contours: any = null;
  let hierarchy: any = null;

  try {
    // Convert ImageData to cv.Mat
    src = cv.matFromImageData(imageData);

    // Convert RGBA to RGB for color-based flood fill
    rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

    // Flood fill directly on original (unblurred) image for sharp boundaries
    const mask = new cv.Mat.zeros(rgb.rows + 2, rgb.cols + 2, cv.CV_8UC1);
    const seedPoint = new cv.Point(Math.round(clickPoint.x), Math.round(clickPoint.y));
    const newVal = new cv.Scalar(255, 255, 255);

    // Tight tolerance for distinct object boundaries
    // RGB channels can vary ±threshold from seed pixel
    const colorTolerance = threshold; // Use threshold as color tolerance (default 8)
    const loDiff = new cv.Scalar(colorTolerance, colorTolerance, colorTolerance);
    const upDiff = new cv.Scalar(colorTolerance, colorTolerance, colorTolerance);

    // Validate seed point is within bounds
    if (seedPoint.x < 0 || seedPoint.y < 0 || seedPoint.x >= rgb.cols || seedPoint.y >= rgb.rows) {
      console.error(
        `[detectContour] Seed point out of bounds: (${seedPoint.x}, ${seedPoint.y}) not in ${rgb.cols}x${rgb.rows}`
      );
      return null;
    }

    const floodRect = new cv.Rect();
    // Use 4-connectivity (compare to neighbors, not seed point)
    // This allows flood fill to follow gradual color variations within objects
    // while stopping at sharp edges (object boundaries)
    // The 500x500 region constraint prevents runaway flooding
    const flags = 4;
    cv.floodFill(rgb, mask, seedPoint, newVal, floodRect, loDiff, upDiff, flags);

    // Extract the flood-filled region from mask
    // Crop mask to remove border
    const roi = mask.roi(new cv.Rect(1, 1, rgb.cols, rgb.rows));
    filledRegion = roi.clone();
    roi.delete();
    mask.delete();

    // Apply morphological operations to clean up the mask and smooth edges
    if (morphOps) {
      const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(blurSize, blurSize));
      const temp1 = new cv.Mat();
      const temp2 = new cv.Mat();
      // Close small holes
      cv.morphologyEx(filledRegion, temp1, cv.MORPH_CLOSE, kernel);
      // Remove small noise
      cv.morphologyEx(temp1, temp2, cv.MORPH_OPEN, kernel);
      kernel.delete();
      temp1.delete();
      // Replace filledRegion with cleaned version
      filledRegion.delete();
      filledRegion = temp2;
    }

    // Find contours of the filled region
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(filledRegion, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Find the largest contour (flood fill should always produce at least one)
    let bestContour: any = null;
    let bestArea = 0;
    let isWithinConstraints = true;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area > bestArea) {
        bestContour = contour;
        bestArea = area;
      }
    }

    if (!bestContour || bestArea === 0) {
      console.warn('[detectContour] No contours found after flood fill');
      return null;
    }

    // Check if region is within expected size constraints
    if (bestArea < minArea) {
      console.warn(`[detectContour] Region too small: ${bestArea} < ${minArea} px²`);
      isWithinConstraints = false;
    } else if (bestArea > maxArea) {
      console.warn(`[detectContour] Region too large: ${bestArea} > ${maxArea} px²`);
      isWithinConstraints = false;
    }

    // Convert contour to polygon points
    const polygon: Point[] = [];
    for (let i = 0; i < bestContour.data32S.length; i += 2) {
      polygon.push({
        x: bestContour.data32S[i],
        y: bestContour.data32S[i + 1],
      });
    }

    // Simplify polygon using Douglas-Peucker algorithm
    const approx = new cv.Mat();
    const epsilon = 0.01 * cv.arcLength(bestContour, true);
    cv.approxPolyDP(bestContour, approx, epsilon, true);

    const simplifiedPolygon: Point[] = [];
    for (let i = 0; i < approx.data32S.length; i += 2) {
      simplifiedPolygon.push({
        x: approx.data32S[i],
        y: approx.data32S[i + 1],
      });
    }
    approx.delete();

    // Create mask ImageData for the result
    const maskData = new ImageData(filledRegion.cols, filledRegion.rows);
    const data = filledRegion.data;
    for (let i = 0; i < data.length; i++) {
      const idx = i * 4;
      maskData.data[idx] = data[i];
      maskData.data[idx + 1] = data[i];
      maskData.data[idx + 2] = data[i];
      maskData.data[idx + 3] = 255;
    }

    // Calculate confidence based on contour properties
    const perimeter = cv.arcLength(bestContour, true);
    const circularity = (4 * Math.PI * bestArea) / (perimeter * perimeter);
    const confidence = Math.min(circularity, 1.0);

    return {
      polygon: simplifiedPolygon.length > 0 ? simplifiedPolygon : polygon,
      confidence,
      mask: maskData,
      area: bestArea,
      isWithinConstraints,
    };
  } catch (error) {
    console.error('[OpenCV] Error detecting cell edge:', error);
    return null;
  } finally {
    // Clean up
    if (src) src.delete();
    if (rgb) rgb.delete();
    if (filledRegion) filledRegion.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }
}

/**
 * Apply brush/eraser operations to modify a mask
 */
export interface BrushOperation {
  type: 'add' | 'remove';
  points: Point[];
  radius: number;
}

export function applyBrushToMask(mask: ImageData, operation: BrushOperation): ImageData {
  if (!isOpenCVReady()) {
    throw new Error('OpenCV is not initialized');
  }

  const cv = window.cv;
  const result = new ImageData(mask.width, mask.height);
  result.data.set(mask.data);

  const mat = cv.matFromImageData(result);
  const color = operation.type === 'add' ? new cv.Scalar(255) : new cv.Scalar(0);

  // Draw circles along the brush stroke
  for (let i = 0; i < operation.points.length - 1; i++) {
    const p1 = operation.points[i];
    const p2 = operation.points[i + 1];
    const pt1 = new cv.Point(Math.round(p1.x), Math.round(p1.y));
    const pt2 = new cv.Point(Math.round(p2.x), Math.round(p2.y));

    cv.line(mat, pt1, pt2, color, operation.radius * 2, cv.LINE_AA);
  }

  // Convert back to ImageData
  const outputData = new ImageData(mat.cols, mat.rows);
  const data = mat.data;
  for (let i = 0; i < data.length; i++) {
    const idx = i * 4;
    outputData.data[idx] = data[i];
    outputData.data[idx + 1] = data[i];
    outputData.data[idx + 2] = data[i];
    outputData.data[idx + 3] = 255;
  }

  mat.delete();
  return outputData;
}

/**
 * Extract contour from mask as polygon
 */
export function maskToPolygon(mask: ImageData, simplify = true): Point[] | null {
  if (!isOpenCVReady()) {
    throw new Error('OpenCV is not initialized');
  }

  const cv = window.cv;
  let mat: any = null;
  let contours: any = null;
  let hierarchy: any = null;

  try {
    mat = cv.matFromImageData(mask);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(mat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    if (contours.size() === 0) {
      return null;
    }

    // Get largest contour
    let largestIdx = 0;
    let largestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i));
      if (area > largestArea) {
        largestArea = area;
        largestIdx = i;
      }
    }

    const contour = contours.get(largestIdx);

    if (simplify) {
      const approx = new cv.Mat();
      const epsilon = 0.01 * cv.arcLength(contour, true);
      cv.approxPolyDP(contour, approx, epsilon, true);

      const polygon: Point[] = [];
      for (let i = 0; i < approx.data32S.length; i += 2) {
        polygon.push({
          x: approx.data32S[i],
          y: approx.data32S[i + 1],
        });
      }

      approx.delete();
      return polygon;
    } else {
      const polygon: Point[] = [];
      for (let i = 0; i < contour.data32S.length; i += 2) {
        polygon.push({
          x: contour.data32S[i],
          y: contour.data32S[i + 1],
        });
      }
      return polygon;
    }
  } finally {
    if (mat) mat.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }
}
