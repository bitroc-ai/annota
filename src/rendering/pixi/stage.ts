/**
 * Annota Rendering - PixiJS Stage Manager
 * High-performance WebGL rendering with viewport culling
 */

import * as PIXI from "pixi.js";
import OpenSeadragon from "openseadragon";
import RBush from "rbush";
import type { Annotation, Filter, StyleExpression } from "../../core/types";
import type { LayerManager } from "../../core/layer";
import { isAnnotationVisible } from "../../core/layer";
import { computeStyle } from "./styles";
import { renderShape, renderImage } from "./shapes";

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
  handleGraphics?: PIXI.Graphics; // For selection handles
  sprite?: PIXI.Sprite; // For image shapes
  lastRenderedScale?: number; // Track last scale for LOD changes
  lastRenderedState?: {
    hovered: boolean;
    selected: boolean;
  };
}

interface SpatialEntry {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
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
  private spatialIndex: RBush<SpatialEntry>;
  private spatialEntryById: Map<string, SpatialEntry>;
  private visibleIds: Set<string>;
  private interacting: boolean;
  private captureSnapshotOnNextRedraw: boolean;
  private snapshotDirty: boolean;
  private snapshotPadPx: number;
  private snapshotTexture: PIXI.RenderTexture | null;
  private snapshotSprite: PIXI.Sprite | null;
  private snapshotBaseScale: number;
  private snapshotBaseDx: number;
  private snapshotBaseDy: number;
  private vectorNeedsRefresh: boolean;

  private style?: StyleExpression;
  private filter?: Filter;
  private visible: boolean;
  private layerManager?: LayerManager;
  private hoveredId?: string;
  private selectedIds: Set<string>;
  private scale: number;
  private redrawRafId: number | null;
  private boundHandleLayerChange: (() => void) | null;

  private constructor(
    app: PIXI.Application,
    viewer: OpenSeadragon.Viewer,
    options: StageOptions = {}
  ) {
    this.app = app;
    this.viewer = viewer;
    this.annotationMap = new Map();
    this.spatialIndex = new RBush<SpatialEntry>();
    this.spatialEntryById = new Map();
    this.visibleIds = new Set();
    this.selectedIds = new Set();
    this.style = options.style;
    this.filter = options.filter;
    this.visible = options.visible ?? true;
    this.layerManager = options.layerManager;
    this.scale = 1.0;
    this.redrawRafId = null;
    this.boundHandleLayerChange = null;
    this.interacting = false;
    this.captureSnapshotOnNextRedraw = false;
    this.snapshotDirty = true;
    this.snapshotPadPx = 256;
    this.snapshotTexture = null;
    this.snapshotSprite = null;
    this.snapshotBaseScale = 1;
    this.snapshotBaseDx = 0;
    this.snapshotBaseDy = 0;
    this.vectorNeedsRefresh = true;

    // Create main container for annotations
    this.container = new PIXI.Container();
    this.container.visible = this.visible;
    this.app.stage.addChild(this.container);

    // Don't run a continuous render loop; we render only when the viewer or annotations change.
    // This avoids spending GPU/CPU on redundant frames, which is especially noticeable with many annotations.
    this.app.ticker.stop();

    // Snapshot sprite (used only during fast pan/zoom interaction)
    this.snapshotSprite = new PIXI.Sprite();
    this.snapshotSprite.visible = false;
    this.app.stage.addChild(this.snapshotSprite);

    // Listen for layer changes to update annotation visibility/opacity
    if (this.layerManager) {
      this.boundHandleLayerChange = this.handleLayerChange.bind(this);
      this.layerManager.observe(this.boundHandleLayerChange);
    }
  }

  /**
   * When interacting (fast pan/zoom), treat annotations as a single transformed layer:
   * only update container transform + render, skip per-annotation culling and LOD work.
   */
  beginInteraction(): void {
    if (this.interacting) return;
    this.interacting = true;
    this.captureSnapshotOnNextRedraw = true;
    this.vectorNeedsRefresh = true;
  }

  endInteraction(): void {
    if (!this.interacting) return;
    this.interacting = false;
    this.captureSnapshotOnNextRedraw = false;
    if (this.snapshotSprite) this.snapshotSprite.visible = false;
    this.container.visible = true;
    this.vectorNeedsRefresh = true;
    // Ensure we re-render vectors immediately so zoom-dependent sizing (e.g. point radius)
    // is correct as soon as interaction ends.
    this.redraw();
  }

  private ensureSnapshotTexture(width: number, height: number): void {
    if (
      this.snapshotTexture &&
      this.snapshotTexture.source.width === width &&
      this.snapshotTexture.source.height === height
    ) {
      return;
    }

    if (this.snapshotTexture) {
      this.snapshotTexture.destroy(true);
    }

    this.snapshotTexture = PIXI.RenderTexture.create({
      width,
      height,
      resolution: 1,
      antialias: false,
    });
  }

  private updateSnapshot(): void {
    if (!this.snapshotSprite) return;

    const pad = this.snapshotPadPx;
    const width = this.app.renderer.width + pad * 2;
    const height = this.app.renderer.height + pad * 2;
    this.ensureSnapshotTexture(width, height);
    if (!this.snapshotTexture) return;

    // Capture after the container transform is updated for the current viewport.
    // Hide the snapshot sprite to avoid feedback rendering.
    const prevSpriteVisible = this.snapshotSprite.visible;
    this.snapshotSprite.visible = false;

    const prevContainerVisible = this.container.visible;
    this.container.visible = true;

    // Render stage into the render texture, offset by padding so small pans don't show empty edges.
    const transform = new PIXI.Matrix().translate(pad, pad);
    this.app.renderer.render({
      container: this.app.stage,
      target: this.snapshotTexture,
      transform,
      clearColor: [0, 0, 0, 0],
    });

    this.container.visible = prevContainerVisible;
    this.snapshotSprite.visible = prevSpriteVisible;

    this.snapshotSprite.texture = this.snapshotTexture;
    this.snapshotDirty = false;
  }

  private upsertSpatialEntry(annotation: Annotation): void {
    const bounds = annotation.shape.bounds;
    const existing = this.spatialEntryById.get(annotation.id);
    if (existing) {
      this.spatialIndex.remove(existing);
    }

    const entry: SpatialEntry = {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      id: annotation.id,
    };
    this.spatialIndex.insert(entry);
    this.spatialEntryById.set(annotation.id, entry);
  }

  private updateEntryRenderCache(id: string): void {
    const entry = this.annotationMap.get(id);
    if (!entry) return;
    entry.lastRenderedScale = this.scale;
    entry.lastRenderedState = {
      hovered: this.hoveredId === id,
      selected: this.selectedIds.has(id),
    };
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
    // Note: We intentionally keep all annotations on the stage even when filtered out.
    // Filter is applied during rendering/culling so changing filters can reveal previously-hidden annotations.

    // Remove existing if present
    this.removeAnnotation(annotation);

    // Create graphics
    const graphics = new PIXI.Graphics();

    // Note: We don't set up PixiJS event listeners here
    // Click detection is handled by OpenSeadragon canvas-press/canvas-release
    // events with spatial queries (store.getAt()) - see annotator.ts

    this.annotationMap.set(annotation.id, { annotation, graphics });
    this.container.addChild(graphics);
    this.upsertSpatialEntry(annotation);

    // Render the annotation
    this.renderAnnotation(annotation.id);
    this.updateEntryRenderCache(annotation.id);
    this.snapshotDirty = true;
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
    this.upsertSpatialEntry(newAnnotation);

    // Invalidate cache to force re-render
    entry.lastRenderedScale = undefined;
    entry.lastRenderedState = undefined;

    // Re-render with updated annotation
    this.renderAnnotation(newAnnotation.id);
    this.updateEntryRenderCache(newAnnotation.id);
    this.snapshotDirty = true;
  }

  /**
   * Remove annotation from stage
   */
  removeAnnotation(annotation: Annotation | string): void {
    const id = typeof annotation === "string" ? annotation : annotation.id;
    const entry = this.annotationMap.get(id);

    if (entry) {
      this.container.removeChild(entry.graphics);
      entry.graphics.destroy();

      // Clean up handle graphics if it exists
      if (entry.handleGraphics) {
        this.container.removeChild(entry.handleGraphics);
        entry.handleGraphics.destroy();
      }

      // Also clean up sprite if it exists (for image shapes)
      if (entry.sprite) {
        this.container.removeChild(entry.sprite);
        entry.sprite.destroy();
      }

      this.annotationMap.delete(id);
    }

    const spatialEntry = this.spatialEntryById.get(id);
    if (spatialEntry) {
      this.spatialIndex.remove(spatialEntry);
      this.spatialEntryById.delete(id);
    }
    this.visibleIds.delete(id);
    this.snapshotDirty = true;
  }

  /**
   * Render a specific annotation
   */
  private renderAnnotation(id: string): void {
    const entry = this.annotationMap.get(id);
    if (!entry) return;

    const { annotation, graphics } = entry;

    // Check filter - hide if filtered out
    if (this.filter && !this.filter(annotation)) {
      graphics.visible = false;
      if (entry.sprite) entry.sprite.visible = false;
      return;
    }

    // Check layer visibility - hide graphics if layer is not visible
    if (
      this.layerManager &&
      !isAnnotationVisible(annotation, this.layerManager)
    ) {
      graphics.visible = false;
      if (entry.sprite) entry.sprite.visible = false;
      return;
    }

    // Make sure graphics is visible
    graphics.visible = true;
    if (entry.sprite) entry.sprite.visible = true;

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

    // Handle image shapes differently - they use sprites
    if (annotation.shape.type === "image") {
      // Clear any existing sprite
      if (entry.sprite) {
        this.container.removeChild(entry.sprite);
        entry.sprite.destroy();
      }

      // Render image shape as sprite
      const sprite = renderImage(
        this.container,
        annotation.shape,
        finalStyle,
        this.scale
      );
      if (sprite) {
        entry.sprite = sprite;
      }

      // Clear graphics (image shapes don't use graphics)
      graphics.clear();
    } else {
      // LOD (Level of Detail): Simplify rendering when zoomed out
      // Only apply to complex shapes (polygons, rectangles) - not to points which are already simple
      const pixelSize = this.getAnnotationPixelSize(annotation);
      const isComplexShape = annotation.shape.type !== "point";

      if (isComplexShape && pixelSize < 3) {
        // When complex annotation is < 3 pixels, simplify to a point
        this.renderSimplifiedAnnotation(graphics, annotation, finalStyle);
      } else {
        // Normal detailed rendering (includes all point annotations)
        renderShape(graphics, annotation.shape, finalStyle, this.scale);
      }
    }

    // Note: Selection handles are rendered by the React SVG Editor (Editor.tsx)
    // We don't render PixiJS handles here to avoid duplicate visuals
    // The SVG Editor provides interactive drag handles for resizing
    if (entry.handleGraphics) {
      entry.handleGraphics.visible = false;
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
  private getAnnotationPixelSizeAtScale(
    annotation: Annotation,
    scale: number
  ): number {
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
    this.annotationMap.forEach((entry) => {
      entry.lastRenderedScale = undefined;
      entry.lastRenderedState = undefined;
    });
    this.redraw();
    this.snapshotDirty = true;
  }

  /**
   * Set filter
   */
  setFilter(filter?: Filter): void {
    this.filter = filter;
    this.redraw();
    this.snapshotDirty = true;
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.visible = visible;
    if (this.snapshotSprite) this.snapshotSprite.visible = false;
    this.snapshotDirty = true;
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
      this.updateEntryRenderCache(prevHoveredId);
    }
    if (id) {
      this.renderAnnotation(id);
      this.updateEntryRenderCache(id);
    }
    this.snapshotDirty = true;
  }

  /**
   * Set selected annotations
   */
  setSelected(ids: string[]): void {
    const prevSelectedIds = new Set(this.selectedIds);
    this.selectedIds = new Set(ids);

    // Re-render affected annotations
    const affectedIds = new Set([...prevSelectedIds, ...this.selectedIds]);
    affectedIds.forEach((id) => {
      this.renderAnnotation(id);
      this.updateEntryRenderCache(id);
    });
    this.snapshotDirty = true;
    // Trigger redraw to show selection changes immediately
    this.redraw();
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
    if (this.redrawRafId !== null) {
      cancelAnimationFrame(this.redrawRafId);
      this.redrawRafId = null;
    }
    this.performRedraw();
  }

  /**
   * Schedule a redraw on the next animation frame (coalesces bursts of viewport events)
   */
  requestRedraw(): void {
    if (this.redrawRafId !== null) return;
    this.redrawRafId = requestAnimationFrame(() => {
      this.redrawRafId = null;
      this.performRedraw();
    });
  }

  /**
   * Perform the actual redraw (called by RAF throttle)
   */
  private performRedraw(): void {
    if (!this.viewer.viewport) return;

    // ANNOTORIOUS PATTERN: Get current scale
    // From stageRenderer.ts line 185-189
    const prevScale = this.scale;
    const containerWidth = this.viewer.viewport.getContainerSize().x;
    const zoom = this.viewer.viewport.getZoom(true);
    this.scale = (zoom * containerWidth) / this.viewer.world.getContentFactor();
    const scaleChangedSignificantly =
      !prevScale || Math.abs(prevScale - this.scale) / this.scale > 0.01;

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

    if (this.interacting) {
      // During interaction, render as a single cached image for maximum pan/zoom speed.
      if (this.captureSnapshotOnNextRedraw || this.snapshotDirty) {
        this.snapshotBaseScale = this.scale;
        this.snapshotBaseDx = dx;
        this.snapshotBaseDy = dy;
        this.updateSnapshot();
        this.captureSnapshotOnNextRedraw = false;
      }

      if (this.snapshotSprite && this.snapshotTexture) {
        const r = this.scale / this.snapshotBaseScale;
        const pad = this.snapshotPadPx;

        this.snapshotSprite.visible = true;
        this.container.visible = false;

        this.snapshotSprite.scale.set(r, r);
        this.snapshotSprite.position.set(
          dx - r * this.snapshotBaseDx - r * pad,
          dy - r * this.snapshotBaseDy - r * pad
        );
      }

      // Force a render immediately to stay synced with the viewer tiles.
      this.app.renderer.render({ container: this.app.stage });
      return;
    }

    // Not interacting: render true vector annotations
    if (this.snapshotSprite) this.snapshotSprite.visible = false;
    this.container.visible = true;

    // Viewport culling: Only render annotations visible in current viewport
    // Add margin to include annotations just outside viewport (prevents pop-in)
    const margin = 100; // pixels
    const viewportWithMargin = {
      minX: viewportBounds.x - margin / this.scale,
      minY: viewportBounds.y - margin / this.scale,
      maxX: viewportBounds.x + viewportBounds.width + margin / this.scale,
      maxY: viewportBounds.y + viewportBounds.height + margin / this.scale,
    };

    // Query spatial index so culling work scales with "visible in viewport", not "all annotations"
    const visibleEntries = this.spatialIndex.search(viewportWithMargin);
    const visibleEntryIds = new Set<string>();
    for (const e of visibleEntries) visibleEntryIds.add(e.id);
    const nextVisibleIds = new Set<string>();

    // Hide previously-visible annotations that are no longer in view
    for (const id of this.visibleIds) {
      // Avoid map lookup work unless we need to hide
      // (Most IDs remain visible during small pans)
      if (visibleEntryIds.has(id)) continue;
      const entry = this.annotationMap.get(id);
      if (!entry) continue;
      entry.graphics.visible = false;
      if (entry.sprite) entry.sprite.visible = false;
    }

    // Render only visible annotations; on pure pans we try hard to avoid per-annotation work
    for (const spatialEntry of visibleEntries) {
      const id = spatialEntry.id;
      nextVisibleIds.add(id);

      const entry = this.annotationMap.get(id);
      if (!entry) continue;

      const wasVisible = this.visibleIds.has(id);

      // Apply filter/layer visibility before doing any heavier work
      if (this.filter && !this.filter(entry.annotation)) {
        entry.graphics.visible = false;
        if (entry.sprite) entry.sprite.visible = false;
        continue;
      }

      const layerVisible =
        !this.layerManager ||
        isAnnotationVisible(entry.annotation, this.layerManager);
      entry.graphics.visible = layerVisible;
      if (entry.sprite) entry.sprite.visible = layerVisible;
      if (!layerVisible) continue;

      // Fast path: during pans (scale unchanged) and for already-visible annotations,
      // the geometry/style caches are still valid, so avoid any LOD/state checks.
      if (
        !this.vectorNeedsRefresh &&
        !scaleChangedSignificantly &&
        wasVisible
      ) {
        continue;
      }

      const currentState = {
        hovered: this.hoveredId === id,
        selected: this.selectedIds.has(id),
      };

      const pixelSize = this.getAnnotationPixelSize(entry.annotation);
      const isComplexShape = entry.annotation.shape.type !== "point";
      const currentLOD = isComplexShape && pixelSize < 3;
      const lastLOD = entry.lastRenderedScale
        ? isComplexShape &&
        this.getAnnotationPixelSizeAtScale(
          entry.annotation,
          entry.lastRenderedScale
        ) < 3
        : null;

      const stateChanged =
        !entry.lastRenderedState ||
        entry.lastRenderedState.hovered !== currentState.hovered ||
        entry.lastRenderedState.selected !== currentState.selected;

      const lodChanged = lastLOD !== currentLOD;

      // Use 1% threshold - smaller changes are visually imperceptible
      const scaleChanged =
        this.vectorNeedsRefresh ||
        !entry.lastRenderedScale ||
        Math.abs(entry.lastRenderedScale - this.scale) / this.scale > 0.01;

      if (stateChanged || lodChanged || scaleChanged) {
        this.renderAnnotation(id);
        this.updateEntryRenderCache(id);
      } else if (!wasVisible) {
        // Newly visible but cache still valid; ensure caches reflect current state/scale.
        this.updateEntryRenderCache(id);
      }
    }

    this.visibleIds = nextVisibleIds;
    this.vectorNeedsRefresh = false;

    // Force an immediate render so the overlay doesn't trail behind the OSD tiles.
    this.app.renderer.render({ container: this.app.stage });

    // Performance logging (can be disabled in production)
    // Disabled to avoid requiring @types/node in browser environment
    // if (process.env.NODE_ENV === 'development' && visible + culled > 50) {
    //     `[PixiStage] Culling: ${visible} visible, ${culled} culled, ${rerendered} re-rendered`
    //   );
    // }
  }

  /**
   * Resize the stage
   */
  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    this.snapshotDirty = true;
    this.redraw();
  }

  /**
   * Handle layer visibility/opacity changes
   */
  private handleLayerChange(): void {
    // Optimized: Only update visibility and alpha of existing graphics
    // instead of full re-render
    this.annotationMap.forEach((entry) => {
      const { annotation, graphics, sprite } = entry;

      // Check layer visibility
      const layerVisible =
        !this.layerManager ||
        isAnnotationVisible(annotation, this.layerManager);

      // Update visibility
      // Note: We also need to check if it's culled by viewport (handled in performRedraw)
      // But for immediate feedback, we can set it here if we know it's currently rendered
      if (graphics.visible !== layerVisible && layerVisible === false) {
        graphics.visible = false;
        if (sprite) sprite.visible = false;
      }

      // Update opacity if visible
      if (layerVisible && this.layerManager) {
        // Update graphics alpha/style without full re-render if possible
        // For now, we'll just trigger a re-render of this specific annotation
        // which is still better than clearing everything
        this.renderAnnotation(annotation.id);
      }
    });

    // Trigger a redraw to handle culling and other state updates
    this.requestRedraw();
    this.snapshotDirty = true;
  }

  /**
   * Destroy the stage
   */
  destroy(): void {
    // Unobserve layer changes
    if (this.layerManager) {
      if (this.boundHandleLayerChange) {
        this.layerManager.unobserve(this.boundHandleLayerChange);
      }
    }

    this.annotationMap.forEach((entry) => {
      entry.graphics.destroy();
      if (entry.handleGraphics) {
        entry.handleGraphics.destroy();
      }
    });
    this.annotationMap.clear();
    this.spatialIndex.clear();
    this.spatialEntryById.clear();
    this.visibleIds.clear();

    if (this.snapshotSprite) {
      this.snapshotSprite.destroy();
      this.snapshotSprite = null;
    }
    if (this.snapshotTexture) {
      this.snapshotTexture.destroy(true);
      this.snapshotTexture = null;
    }

    if (this.redrawRafId !== null) {
      cancelAnimationFrame(this.redrawRafId);
      this.redrawRafId = null;
    }
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
