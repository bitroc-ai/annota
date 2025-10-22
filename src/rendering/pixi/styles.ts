/**
 * Annota Rendering - Style Computation
 * Compute PixiJS-compatible styles from annotation styles
 */

import * as PIXI from 'pixi.js';
import type { Annotation, AnnotationStyle, StyleExpression } from '../../core/types';

/**
 * Default style values
 */
const DEFAULT_FILL = 0x00ff00; // Green
const DEFAULT_FILL_ALPHA = 0.25;
const DEFAULT_STROKE = 0xffffff; // White
const DEFAULT_STROKE_ALPHA = 1.0;
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Computed graphics style for PixiJS
 */
export interface ComputedStyle {
  fill: {
    color: number;
    alpha: number;
  };
  stroke: {
    color: number;
    alpha: number;
    width: number;
  };
}

/**
 * Parse color string to PIXI color number
 */
function parseColor(color: string): number {
  try {
    return new PIXI.Color(color).toNumber();
  } catch {
    return DEFAULT_FILL;
  }
}

/**
 * Extract alpha from color string if it's rgba format
 */
function extractAlpha(color?: string): number | undefined {
  if (!color) return undefined;

  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgba && rgba[4]) {
    return parseFloat(rgba[4]);
  }

  return undefined;
}

/**
 * Compute style for an annotation
 */
export function computeStyle(
  annotation: Annotation,
  styleExpression?: StyleExpression,
  state?: {
    hovered?: boolean;
    selected?: boolean;
  }
): ComputedStyle {
  // Evaluate style expression
  let style: AnnotationStyle | undefined;

  if (typeof styleExpression === 'function') {
    style = styleExpression(annotation);
  } else {
    style = styleExpression;
  }

  // Merge with annotation's own style
  const mergedStyle: AnnotationStyle = {
    ...style,
    ...annotation.style,
  };

  // Parse fill
  const fillColor = mergedStyle.fill ? parseColor(mergedStyle.fill) : DEFAULT_FILL;

  const fillAlphaFromColor = mergedStyle.fill ? extractAlpha(mergedStyle.fill) : undefined;

  let fillAlpha = mergedStyle.fillOpacity ?? fillAlphaFromColor ?? DEFAULT_FILL_ALPHA;

  // Parse stroke
  const strokeColor = mergedStyle.stroke ? parseColor(mergedStyle.stroke) : DEFAULT_STROKE;

  const strokeAlphaFromColor = mergedStyle.stroke ? extractAlpha(mergedStyle.stroke) : undefined;

  let strokeAlpha = mergedStyle.strokeOpacity ?? strokeAlphaFromColor ?? DEFAULT_STROKE_ALPHA;
  let strokeWidth = mergedStyle.strokeWidth ?? DEFAULT_STROKE_WIDTH;

  // Apply state modifiers
  if (state?.selected) {
    fillAlpha = Math.min(fillAlpha * 1.5, 1.0);
    strokeWidth = strokeWidth * 1.5;
  }

  if (state?.hovered) {
    fillAlpha = Math.min(fillAlpha * 1.2, 1.0);
    strokeAlpha = Math.min(strokeAlpha * 1.2, 1.0);
  }

  return {
    fill: {
      color: fillColor,
      alpha: fillAlpha,
    },
    stroke: {
      color: strokeColor,
      alpha: strokeAlpha,
      width: strokeWidth,
    },
  };
}
