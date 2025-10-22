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
 * Annotation graphics entry
 */
interface AnnotationGraphics {
  annotation: Annotation;
  graphics: PIXI.Graphics;
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

    // Check layer visibility
    if (this.layerManager && !isAnnotationVisible(annotation, this.layerManager)) {
      return;
    }

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
    if (this.layerManager) {
      const layerOpacity = getEffectiveOpacity(annotation, this.layerManager);
      graphics.alpha = layerOpacity;
    } else {
      graphics.alpha = computedStyle.fill.alpha ?? 1;
    }

    // Render shape
    renderShape(graphics, annotation.shape, computedStyle, this.scale);
  }

  /**
   * Set style expression
   */
  setStyle(style?: StyleExpression): void {
    this.style = style;
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
   * Redraw all annotations
   */
  redraw(): void {
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

    // Render all annotations
    this.annotationMap.forEach((_, id) => {
      this.renderAnnotation(id);
    });
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
