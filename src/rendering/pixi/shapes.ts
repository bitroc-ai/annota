/**
 * Annota Rendering - Shape Renderers
 * PixiJS graphics rendering for each shape type
 */

import * as PIXI from 'pixi.js';
import type {
  Shape,
  PointShape,
  CircleShape,
  EllipseShape,
  RectangleShape,
  LineShape,
  PolygonShape,
  FreehandShape,
  MultiPolygonShape,
  ImageShape,
  PathShape,
  ControlPoint,
} from '../../core/types';
import type { ComputedStyle } from './styles';

/**
 * Render a point shape
 */
export function renderPoint(
  graphics: PIXI.Graphics,
  shape: PointShape,
  style: ComputedStyle,
  scale: number
): void {
  const { point } = shape;
  const radius = 5 / scale; // Counter-scale for consistent size

  graphics.clear();
  graphics.position.set(0, 0);

  // Draw circle at image coordinates
  graphics
    .circle(point.x, point.y, radius)
    .fill({ color: style.fill.color, alpha: style.fill.alpha })
    .stroke({
      width: style.stroke.width / scale,
      color: style.stroke.color,
      alpha: style.stroke.alpha,
    });
}

/**
 * Render a circle shape
 */
export function renderCircle(
  graphics: PIXI.Graphics,
  shape: CircleShape,
  style: ComputedStyle,
  scale: number
): void {
  const { center, radius } = shape;

  graphics.clear();
  graphics.position.set(0, 0);

  // Draw circle at image coordinates
  graphics
    .circle(center.x, center.y, radius)
    .fill({ color: style.fill.color, alpha: style.fill.alpha })
    .stroke({
      width: style.stroke.width / scale,
      color: style.stroke.color,
      alpha: style.stroke.alpha,
    });
}

/**
 * Render an ellipse shape
 */
export function renderEllipse(
  graphics: PIXI.Graphics,
  shape: EllipseShape,
  style: ComputedStyle,
  scale: number
): void {
  const { center, radiusX, radiusY, rotation = 0 } = shape;

  graphics.clear();
  graphics.position.set(0, 0);

  // Save context if rotation is needed
  if (rotation !== 0) {
    // For rotated ellipse, we need to transform the graphics
    graphics.position.set(center.x, center.y);
    graphics.rotation = rotation;

    graphics
      .ellipse(0, 0, radiusX, radiusY)
      .fill({ color: style.fill.color, alpha: style.fill.alpha })
      .stroke({
        width: style.stroke.width / scale,
        color: style.stroke.color,
        alpha: style.stroke.alpha,
      });

    graphics.rotation = 0;
    graphics.position.set(0, 0);
  } else {
    // No rotation - simpler case
    graphics
      .ellipse(center.x, center.y, radiusX, radiusY)
      .fill({ color: style.fill.color, alpha: style.fill.alpha })
      .stroke({
        width: style.stroke.width / scale,
        color: style.stroke.color,
        alpha: style.stroke.alpha,
      });
  }
}

/**
 * Render a rectangle shape
 */
export function renderRectangle(
  graphics: PIXI.Graphics,
  shape: RectangleShape,
  style: ComputedStyle,
  scale: number
): void {
  const { x, y, width, height } = shape;

  graphics.clear();
  graphics.position.set(0, 0);

  // Draw rectangle at image coordinates
  graphics
    .rect(x, y, width, height)
    .fill({ color: style.fill.color, alpha: style.fill.alpha })
    .stroke({
      width: style.stroke.width / scale,
      color: style.stroke.color,
      alpha: style.stroke.alpha,
    });
}

/**
 * Render a line shape
 */
export function renderLine(
  graphics: PIXI.Graphics,
  shape: LineShape,
  style: ComputedStyle,
  scale: number
): void {
  const { start, end } = shape;

  graphics.clear();
  graphics.position.set(0, 0);

  // Draw line
  graphics
    .moveTo(start.x, start.y)
    .lineTo(end.x, end.y)
    .stroke({
      width: style.stroke.width / scale,
      color: style.stroke.color,
      alpha: style.stroke.alpha,
    });
}

/**
 * Render a polygon shape
 */
export function renderPolygon(
  graphics: PIXI.Graphics,
  shape: PolygonShape,
  style: ComputedStyle,
  scale: number
): void {
  if (shape.points.length === 0) return;

  graphics.clear();
  graphics.position.set(0, 0);

  // Flatten points to array of coordinates
  const points = shape.points.flatMap(p => [p.x, p.y]);

  if (shape.points.length < 3) {
    // Draw as line or points if less than 3 vertices (preview mode)
    if (shape.points.length === 1) {
      // Draw single point
      const p = shape.points[0];
      const radius = 5 / scale;
      graphics
        .circle(p.x, p.y, radius)
        .fill({ color: style.stroke.color, alpha: style.stroke.alpha });
    } else if (shape.points.length === 2) {
      // Draw line between two points
      graphics
        .moveTo(points[0], points[1])
        .lineTo(points[2], points[3])
        .stroke({
          width: style.stroke.width / scale,
          color: style.stroke.color,
          alpha: style.stroke.alpha,
        });

      // Draw endpoint circles
      const radius = 5 / scale;
      for (const p of shape.points) {
        graphics
          .circle(p.x, p.y, radius)
          .fill({ color: style.stroke.color, alpha: style.stroke.alpha });
      }
    }
    return;
  }

  // Draw filled polygon (3+ points)
  graphics.poly(points, true);
  graphics.fill({ color: style.fill.color, alpha: style.fill.alpha });

  // Draw stroke
  graphics.poly(points, true);
  graphics.stroke({
    width: style.stroke.width / scale,
    color: style.stroke.color,
    alpha: style.stroke.alpha,
  });
}

/**
 * Render a freehand shape
 */
export function renderFreehand(
  graphics: PIXI.Graphics,
  shape: FreehandShape,
  style: ComputedStyle,
  scale: number
): void {
  if (shape.points.length < 2) return;

  graphics.clear();
  graphics.position.set(0, 0);

  const points = shape.points.flatMap(p => [p.x, p.y]);

  if (shape.closed) {
    // Closed freehand - treat like polygon
    graphics.poly(points, true);
    graphics.fill({ color: style.fill.color, alpha: style.fill.alpha });

    graphics.poly(points, true);
    graphics.stroke({
      width: style.stroke.width / scale,
      color: style.stroke.color,
      alpha: style.stroke.alpha,
    });
  } else {
    // Open freehand - just draw the path
    graphics.poly(points, false);
    graphics.stroke({
      width: style.stroke.width / scale,
      color: style.stroke.color,
      alpha: style.stroke.alpha,
    });
  }
}

/**
 * Render a multipolygon shape
 */
export function renderMultiPolygon(
  graphics: PIXI.Graphics,
  shape: MultiPolygonShape,
  style: ComputedStyle,
  scale: number
): void {
  graphics.clear();

  // Find the first point of the first polygon as origin
  const firstPolygon = shape.polygons.find(p => p.length >= 3);
  if (!firstPolygon) return;

  const origin = firstPolygon[0];
  graphics.position.set(origin.x, origin.y);

  for (const polygon of shape.polygons) {
    if (polygon.length < 3) continue;

    // Transform points to local space
    const localPoints = polygon.flatMap(p => [p.x - origin.x, p.y - origin.y]);

    // Draw fill using PixiJS v8 API
    graphics.poly(localPoints, true);
    graphics.fill({ color: style.fill.color, alpha: style.fill.alpha });

    // Draw stroke using PixiJS v8 API
    graphics.poly(localPoints, true);
    graphics.stroke({
      width: style.stroke.width / scale,
      color: style.stroke.color,
      alpha: style.stroke.alpha,
    });
  }
}

/**
 * Render a path shape (closed curve)
 * Supports Catmull-Rom spline and Bezier curve smoothing
 */
export function renderPath(
  graphics: PIXI.Graphics,
  shape: PathShape,
  style: ComputedStyle,
  scale: number
): void {
  if (shape.points.length < 2) return;

  graphics.clear();

  const origin = shape.points[0];
  graphics.position.set(origin.x, origin.y);

  // Start the path
  graphics.moveTo(0, 0);

  // Draw based on smoothing algorithm
  if (shape.smoothing === 'bezier' && hasHandles(shape.points)) {
    // Draw bezier curves using control handles
    for (let i = 1; i < shape.points.length; i++) {
      const p1 = shape.points[i - 1];
      const p2 = shape.points[i];

      const cp1 = p1.handleOut
        ? { x: p1.x + p1.handleOut.x - origin.x, y: p1.y + p1.handleOut.y - origin.y }
        : { x: p1.x - origin.x, y: p1.y - origin.y };

      const cp2 = p2.handleIn
        ? { x: p2.x + p2.handleIn.x - origin.x, y: p2.y + p2.handleIn.y - origin.y }
        : { x: p2.x - origin.x, y: p2.y - origin.y };

      graphics.bezierCurveTo(
        cp1.x,
        cp1.y,
        cp2.x,
        cp2.y,
        p2.x - origin.x,
        p2.y - origin.y
      );
    }

    // Close the path if needed
    if (shape.closed) {
      const lastPoint = shape.points[shape.points.length - 1];
      const firstPoint = shape.points[0];

      const cp1 = lastPoint.handleOut
        ? {
            x: lastPoint.x + lastPoint.handleOut.x - origin.x,
            y: lastPoint.y + lastPoint.handleOut.y - origin.y,
          }
        : { x: lastPoint.x - origin.x, y: lastPoint.y - origin.y };

      const cp2 = firstPoint.handleIn
        ? {
            x: firstPoint.x + firstPoint.handleIn.x - origin.x,
            y: firstPoint.y + firstPoint.handleIn.y - origin.y,
          }
        : { x: 0, y: 0 };

      graphics.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, 0, 0);
    }
  } else if (shape.smoothing === 'catmull-rom') {
    // Draw Catmull-Rom spline
    const points = shape.closed
      ? [...shape.points, shape.points[0], shape.points[1]]
      : shape.points;

    for (let i = 1; i < points.length - 2; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

      // Draw quadratic curve segments approximating Catmull-Rom
      for (let t = 0; t <= 1; t += 0.1) {
        const t2 = t * t;
        const t3 = t2 * t;

        const x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

        const y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        graphics.lineTo(x - origin.x, y - origin.y);
      }
    }
  } else {
    // No smoothing - draw straight lines
    for (let i = 1; i < shape.points.length; i++) {
      const p = shape.points[i];
      graphics.lineTo(p.x - origin.x, p.y - origin.y);
    }

    if (shape.closed) {
      graphics.lineTo(0, 0);
    }
  }

  // Fill if closed
  if (shape.closed) {
    graphics.fill({ color: style.fill.color, alpha: style.fill.alpha });
  }

  // Stroke the path
  graphics.stroke({
    width: style.stroke.width / scale,
    color: style.stroke.color,
    alpha: style.stroke.alpha,
  });
}

/**
 * Helper: Check if any points have control handles
 */
function hasHandles(points: ControlPoint[]): boolean {
  return points.some(p => p.handleIn || p.handleOut);
}

// Cache for loaded image textures to avoid repeated loading
const textureCache = new Map<string, PIXI.Texture>();

/**
 * Render an image shape
 * Note: This creates a PIXI.Sprite instead of using Graphics
 * The sprite will be managed separately by the annotation layer
 */
export function renderImage(
  container: PIXI.Container,
  shape: ImageShape,
  _style: ComputedStyle,
  _scale: number
): PIXI.Sprite | null {
  // Check if texture is already cached and loaded
  const cachedTexture = textureCache.get(shape.url);
  if (cachedTexture) {
    // Use cached texture - create sprite immediately
    const sprite = new PIXI.Sprite(cachedTexture);
    sprite.x = shape.x;
    sprite.y = shape.y;

    // Use scale to set size
    const scaleX = shape.width / cachedTexture.width;
    const scaleY = shape.height / cachedTexture.height;
    sprite.scale.set(scaleX, scaleY);

    sprite.alpha = shape.opacity !== undefined ? shape.opacity : 0.6;
    container.addChild(sprite);
    return sprite;
  }

  // Texture not cached - need to load it
  const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  sprite.x = shape.x;
  sprite.y = shape.y;
  sprite.alpha = shape.opacity !== undefined ? shape.opacity : 0.6;
  container.addChild(sprite);

  // Load the texture asynchronously
  const img = new Image();
  img.onload = () => {
    try {
      // Create texture directly from the loaded image element
      // PixiJS v8 handles this internally without BaseTexture
      const texture = PIXI.Texture.from(img);

      // Ensure texture is valid before proceeding
      if (!texture || texture.width === 0 || texture.height === 0) {
        console.error('Failed to create valid texture from image');
        return;
      }

      // Cache the texture for future use
      textureCache.set(shape.url, texture);

      // Update sprite
      sprite.texture = texture;

      // Use scale to set size - check that sprite.scale exists
      if (sprite.scale) {
        const scaleX = shape.width / texture.width;
        const scaleY = shape.height / texture.height;
        sprite.scale.set(scaleX, scaleY);
      }
    } catch (err) {
      console.error('Failed to create texture from image:', err);
    }
  };
  img.onerror = (err) => {
    console.error('Failed to load image for annotation:', err);
  };
  img.src = shape.url;

  return sprite;
}

/**
 * Render any shape (dispatcher)
 */
export function renderShape(
  graphics: PIXI.Graphics,
  shape: Shape,
  style: ComputedStyle,
  scale: number
): void {
  graphics.clear();

  switch (shape.type) {
    case 'point':
      renderPoint(graphics, shape, style, scale);
      break;
    case 'circle':
      renderCircle(graphics, shape, style, scale);
      break;
    case 'ellipse':
      renderEllipse(graphics, shape, style, scale);
      break;
    case 'rectangle':
      renderRectangle(graphics, shape, style, scale);
      break;
    case 'line':
      renderLine(graphics, shape, style, scale);
      break;
    case 'polygon':
      renderPolygon(graphics, shape, style, scale);
      break;
    case 'freehand':
      renderFreehand(graphics, shape, style, scale);
      break;
    case 'multipolygon':
      renderMultiPolygon(graphics, shape, style, scale);
      break;
    case 'path':
      renderPath(graphics, shape, style, scale);
      break;
    case 'image':
      // Image shapes are handled differently - they use sprites not graphics
      // The caller should use renderImage() directly for image shapes
      break;
  }
}
