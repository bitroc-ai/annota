/**
 * Annota Rendering - PixiJS Stage Manager
 * High-performance WebGL rendering with viewport culling
 */

import * as PIXI from 'pixi.js';
import OpenSeadragon from 'openseadragon';
import type { Annotation, Filter, StyleExpression } from '../../core/types';
import type { LayerManager } from '../../core/layer';
import { isAnnotationVisible, getEffectiveOpacity } from '../../core/layer';
import { computeStyle } from './styles';
import { renderShape } from './shapes';

/**
 * Stage options
 */
export interface StageOptions {
  style?: StyleExpression;
  filter?: Filter;
  visible?: boolean;
  layerManager?: LayerManager;
}

/**
 * Annotation graphics entry with render cache
 */
interface AnnotationGraphics {
  annotation: Annotation;
  graphics: PIXI.Graphics;
  lastRenderedScale?: number; // Track last scale for LOD changes
  lastRenderedState?: {
    hovered: boolean;
    selected: boolean;
  };
}

/**
 * PixiJS Stage Manager
 * Manages WebGL rendering of annotations with viewport culling
 */
export class PixiStage {
  private app: PIXI.Application;
  private viewer: OpenSeadragon.Viewer;
  private container: PIXI.Container;
  private annotationMap: Map<string, AnnotationGraphics>;

  private style?: StyleExpression;
  private filter?: Filter;
  private visible: boolean;
  private layerManager?: LayerManager;
  private hoveredId?: string;
  private selectedIds: Set<string>;
  private scale: number;

  private constructor(
    app: PIXI.Application,
    viewer: OpenSeadragon.Viewer,
    options: StageOptions = {}
  ) {
    this.app = app;
    this.viewer = viewer;
    this.annotationMap = new Map();
    this.selectedIds = new Set();
    this.style = options.style;
    this.filter = options.filter;
    this.visible = options.visible ?? true;
    this.layerManager = options.layerManager;
    this.scale = 1.0;

    // Create main container for annotations
    this.container = new PIXI.Container();
    this.container.visible = this.visible;
    this.app.stage.addChild(this.container);
  }

  /**
   * Create a new PixiStage instance (async due to PixiJS v8)
   */
  static async create(
    viewer: OpenSeadragon.Viewer,
    canvas: HTMLCanvasElement,
    options: StageOptions = {}
  ): Promise<PixiStage> {
    // Create PixiJS application using v8 async init
    const app = new PIXI.Application();
    await app.init({
      canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundAlpha: 0,
      antialias: true,
      // Disable autoDensity to prevent devicePixelRatio scaling
      // On Retina displays (devicePixelRatio = 2), autoDensity: true would cause 2x coordinate scaling
      autoDensity: false,
      resolution: 1,
    });

    return new PixiStage(app, viewer, options);
  }

  /**
   * Add annotation to stage
   */
  addAnnotation(annotation: Annotation): void {
    // Check filter
    if (this.filter && !this.filter(annotation)) {
      return;
    }

    // Don't check layer visibility here - let renderAnnotation handle it
    // This allows annotations to be shown/hidden when layer visibility changes

    // Remove existing if present
    this.removeAnnotation(annotation);

    // Create graphics
    const graphics = new PIXI.Graphics();

    // Note: We don't set up PixiJS event listeners here
    // Click detection is handled by OpenSeadragon canvas-press/canvas-release
    // events with spatial queries (store.getAt()) - see annotator.ts

    this.annotationMap.set(annotation.id, { annotation, graphics });
    this.container.addChild(graphics);

    // Render the annotation
    this.renderAnnotation(annotation.id);
  }

  /**
   * Update annotation on stage
   */
  updateAnnotation(oldAnnotation: Annotation, newAnnotation: Annotation): void {
    const entry = this.annotationMap.get(oldAnnotation.id);
    if (!entry) {
      // Annotation doesn't exist, add it
      this.addAnnotation(newAnnotation);
      return;
    }

    // Update the annotation reference in the map
    entry.annotation = newAnnotation;

    // Invalidate cache to force re-render
    entry.lastRenderedScale = undefined;
    entry.lastRenderedState = undefined;

    // Re-render with updated annotation
    this.renderAnnotation(newAnnotation.id);
  }

  /**
   * Remove annotation from stage
   */
  removeAnnotation(annotation: Annotation | string): void {
    const id = typeof annotation === 'string' ? annotation : annotation.id;
    const entry = this.annotationMap.get(id);

    if (entry) {
      this.container.removeChild(entry.graphics);
      entry.graphics.destroy();
      this.annotationMap.delete(id);
    }
  }

  /**
   * Render a specific annotation
   */
  private renderAnnotation(id: string): void {
    const entry = this.annotationMap.get(id);
    if (!entry) return;

    const { annotation, graphics } = entry;

    // Check layer visibility - hide graphics if layer is not visible
    if (this.layerManager && !isAnnotationVisible(annotation, this.layerManager)) {
      graphics.visible = false;
      return;
    }

    // Make sure graphics is visible
    graphics.visible = true;

    // Compute style
    const computedStyle = computeStyle(annotation, this.style, {
      hovered: this.hoveredId === id,
      selected: this.selectedIds.has(id),
    });

    // Apply layer opacity if layer manager is present
    // Multiply layer opacity with individual annotation's fill/stroke alpha
    let finalStyle = computedStyle;
    if (this.layerManager) {
      const layer = this.layerManager.getLayerForAnnotation(annotation);
      const layerOpacity = layer?.opacity ?? 1;
      finalStyle = {
        fill: {
          color: computedStyle.fill.color,
          alpha: computedStyle.fill.alpha * layerOpacity,
        },
        stroke: {
          color: computedStyle.stroke.color,
          alpha: computedStyle.stroke.alpha * layerOpacity,
          width: computedStyle.stroke.width,
        },
      };
      graphics.alpha = 1; // Keep graphics alpha at 1, opacity is in the style
    } else {
      graphics.alpha = 1;
    }

    // LOD (Level of Detail): Simplify rendering when zoomed out
    // Only apply to complex shapes (polygons, rectangles) - not to points which are already simple
    const pixelSize = this.getAnnotationPixelSize(annotation);
    const isComplexShape = annotation.shape.type !== 'point';

    if (isComplexShape && pixelSize < 3) {
      // When complex annotation is < 3 pixels, simplify to a point
      this.renderSimplifiedAnnotation(graphics, annotation, finalStyle);
    } else {
      // Normal detailed rendering (includes all point annotations)
      renderShape(graphics, annotation.shape, finalStyle, this.scale);
    }
  }

  /**
   * Get annotation size in screen pixels at current scale
   */
  private getAnnotationPixelSize(annotation: Annotation): number {
    return this.getAnnotationPixelSizeAtScale(annotation, this.scale);
  }

  /**
   * Get annotation size in screen pixels at a specific scale
   */
  private getAnnotationPixelSizeAtScale(annotation: Annotation, scale: number): number {
    const bounds = annotation.shape.bounds;
    const width = (bounds.maxX - bounds.minX) * scale;
    const height = (bounds.maxY - bounds.minY) * scale;
    return Math.max(width, height);
  }

  /**
   * Render simplified version of annotation (for LOD)
   */
  private renderSimplifiedAnnotation(
    graphics: PIXI.Graphics,
    annotation: Annotation,
    style: any
  ): void {
    graphics.clear();

    // Just draw a small point/circle at annotation center
    const bounds = annotation.shape.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;

    graphics.circle(cx, cy, 2 / this.scale); // 2 pixel radius
    graphics.fill({ color: style.fill.color, alpha: style.fill.alpha ?? 1 });
  }

  /**
   * Set style expression
   */
  setStyle(style?: StyleExpression): void {
    this.style = style;
    // Invalidate all caches since style affects rendering
    this.annotationMap.forEach(entry => {
      entry.lastRenderedScale = undefined;
      entry.lastRenderedState = undefined;
    });
    this.redraw();
  }

  /**
   * Set filter
   */
  setFilter(filter?: Filter): void {
    this.filter = filter;

    // Re-add all annotations (filter will be applied)
    const annotations = Array.from(this.annotationMap.values()).map(e => e.annotation);
    this.annotationMap.clear();
    this.container.removeChildren();

    annotations.forEach(annotation => this.addAnnotation(annotation));
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.visible = visible;
  }

  /**
   * Set hovered annotation
   */
  setHovered(id?: string): void {
    if (this.hoveredId === id) return;

    const prevHoveredId = this.hoveredId;
    this.hoveredId = id;

    // Re-render affected annotations
    if (prevHoveredId) {
      this.renderAnnotation(prevHoveredId);
    }
    if (id) {
      this.renderAnnotation(id);
    }
  }

  /**
   * Set selected annotations
   */
  setSelected(ids: string[]): void {
    const prevSelectedIds = new Set(this.selectedIds);
    this.selectedIds = new Set(ids);

    // Re-render affected annotations
    const affectedIds = new Set([...prevSelectedIds, ...this.selectedIds]);
    affectedIds.forEach(id => this.renderAnnotation(id));
  }

  /**
   * Get current viewport scale
   */
  getScale(): number {
    return this.scale;
  }

  /**
   * Redraw all annotations (immediate execution for perfect sync)
   */
  redraw(): void {
    // Execute immediately for perfect sync with OpenSeadragon viewport
    // OSD's event handlers already provide natural throttling
    this.performRedraw();
  }

  /**
   * Perform the actual redraw (called by RAF throttle)
   */
  private performRedraw(): void {
    if (!this.viewer.viewport) return;

    // ANNOTORIOUS PATTERN: Get current scale
    // From stageRenderer.ts line 185-189
    const containerWidth = this.viewer.viewport.getContainerSize().x;
    const zoom = this.viewer.viewport.getZoom(true);
    this.scale = (zoom * containerWidth) / this.viewer.world.getContentFactor();

    // ANNOTORIOUS PATTERN: Get viewport bounds in image coordinates
    // From stageRenderer.ts line 197
    const viewportBounds = this.viewer.viewport.viewportToImageRectangle(
      this.viewer.viewport.getBounds(true)
    );

    // ANNOTORIOUS PATTERN: Calculate transformation
    // From stageRenderer.ts line 244-246
    const dx = -viewportBounds.x * this.scale;
    const dy = -viewportBounds.y * this.scale;

    // Apply transformation to container
    this.container.position.set(dx, dy);
    this.container.scale.set(this.scale, this.scale);

    // Viewport culling: Only render annotations visible in current viewport
    // Add margin to include annotations just outside viewport (prevents pop-in)
    const margin = 100; // pixels
    const viewportWithMargin = {
      minX: viewportBounds.x - margin / this.scale,
      minY: viewportBounds.y - margin / this.scale,
      maxX: viewportBounds.x + viewportBounds.width + margin / this.scale,
      maxY: viewportBounds.y + viewportBounds.height + margin / this.scale,
    };

    // Render only visible annotations
    // Smart caching: only re-render graphics if LOD or state changed
    let culled = 0;
    let visible = 0;
    let rerendered = 0;

    this.annotationMap.forEach((entry, id) => {
      const bounds = entry.annotation.shape.bounds;

      // Check if annotation bounds intersect with viewport
      const isVisible =
        bounds.maxX >= viewportWithMargin.minX &&
        bounds.minX <= viewportWithMargin.maxX &&
        bounds.maxY >= viewportWithMargin.minY &&
        bounds.minY <= viewportWithMargin.maxY;

      if (isVisible) {
        entry.graphics.visible = true;
        visible++;

        // Check if we need to re-render the graphics
        const currentState = {
          hovered: this.hoveredId === id,
          selected: this.selectedIds.has(id),
        };

        const pixelSize = this.getAnnotationPixelSize(entry.annotation);
        const isComplexShape = entry.annotation.shape.type !== 'point';
        const currentLOD = isComplexShape && pixelSize < 3;
        const lastLOD = entry.lastRenderedScale
          ? isComplexShape &&
            this.getAnnotationPixelSizeAtScale(entry.annotation, entry.lastRenderedScale) < 3
          : null;

        const stateChanged =
          !entry.lastRenderedState ||
          entry.lastRenderedState.hovered !== currentState.hovered ||
          entry.lastRenderedState.selected !== currentState.selected;

        const lodChanged = lastLOD !== currentLOD;

        // Check if scale changed significantly (for counter-scaled elements)
        // Use 1% threshold - smaller changes are visually imperceptible
        const scaleChanged =
          !entry.lastRenderedScale ||
          Math.abs(entry.lastRenderedScale - this.scale) / this.scale > 0.01;

        // Re-render if state, LOD, or scale changed
        if (stateChanged || lodChanged || scaleChanged) {
          this.renderAnnotation(id);
          entry.lastRenderedScale = this.scale;
          entry.lastRenderedState = currentState;
          rerendered++;
        }
      } else {
        // Hide off-screen annotation (no re-render needed)
        entry.graphics.visible = false;
        culled++;
      }
    });

    // Performance logging (can be disabled in production)
    // Disabled to avoid requiring @types/node in browser environment
    // if (process.env.NODE_ENV === 'development' && visible + culled > 50) {
    //   console.log(
    //     `[PixiStage] Culling: ${visible} visible, ${culled} culled, ${rerendered} re-rendered`
    //   );
    // }
  }

  /**
   * Resize the stage
   */
  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    this.redraw();
  }

  /**
   * Destroy the stage
   */
  destroy(): void {
    this.annotationMap.forEach(entry => entry.graphics.destroy());
    this.annotationMap.clear();
    this.app.destroy(true, { children: true, texture: true });
  }
}

/**
 * Create a new PixiJS stage
 */
export function createPixiStage(
  viewer: OpenSeadragon.Viewer,
  canvas: HTMLCanvasElement,
  options?: StageOptions
): Promise<PixiStage> {
  return PixiStage.create(viewer, canvas, options);
}
