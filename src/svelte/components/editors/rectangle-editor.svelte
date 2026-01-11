<script lang="ts">
  /**
   * Rectangle Editor
   *
   * Renders editing handles for rectangle annotations.
   * Provides 4 corner handles + 4 edge handles + body drag.
   * Ported from annotorious/src/annotation/editors/rectangle/RectangleEditor.svelte
   */
  import Handle from "./handle.svelte";
  import Editor from "./editor.svelte";
  import type OpenSeadragon from "openseadragon";
  import type { Shape, RectangleShape, Bounds } from "annota";

  interface Props {
    shape: RectangleShape;
    viewportScale?: number;
    viewer: OpenSeadragon.Viewer;
    svgEl?: SVGSVGElement;
    onchange?: (shape: Shape) => void;
    ongrab?: (evt: PointerEvent) => void;
    onrelease?: (evt: PointerEvent) => void;
  }

  let {
    shape = $bindable(),
    viewportScale = 1,
    viewer,
    svgEl,
    onchange,
    ongrab,
    onrelease,
  }: Props = $props();

  // Get geometry from shape
  const geom = $derived({
    x: shape.x,
    y: shape.y,
    w: shape.width,
    h: shape.height,
  });

  /**
   * Rectangle editor function - calculates new shape based on handle + delta
   */
  const editor = (
    rectangle: Shape,
    handle: string,
    delta: [number, number],
  ): Shape => {
    if (rectangle.type !== "rectangle") return rectangle;

    const initialBounds = rectangle.bounds;
    let [x0, y0] = [initialBounds.minX, initialBounds.minY];
    let [x1, y1] = [initialBounds.maxX, initialBounds.maxY];

    const [dx, dy] = delta;

    if (handle === "SHAPE") {
      // Move entire rectangle
      x0 += dx;
      x1 += dx;
      y0 += dy;
      y1 += dy;
    } else {
      // Resize based on handle
      switch (handle) {
        case "TOP":
        case "TOP_LEFT":
        case "TOP_RIGHT":
          y0 += dy;
          break;
        case "BOTTOM":
        case "BOTTOM_LEFT":
        case "BOTTOM_RIGHT":
          y1 += dy;
          break;
      }

      switch (handle) {
        case "LEFT":
        case "TOP_LEFT":
        case "BOTTOM_LEFT":
          x0 += dx;
          break;
        case "RIGHT":
        case "TOP_RIGHT":
        case "BOTTOM_RIGHT":
          x1 += dx;
          break;
      }
    }

    // Normalize to prevent negative dimensions
    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);

    const bounds: Bounds = {
      minX: x,
      minY: y,
      maxX: x + w,
      maxY: y + h,
    };

    return {
      type: "rectangle",
      x,
      y,
      width: w,
      height: h,
      bounds,
    };
  };

  const handleChange = (newShape: Shape) => {
    shape = newShape as RectangleShape;
    onchange?.(newShape);
  };
</script>

<Editor
  bind:shape
  {editor}
  {viewportScale}
  {viewer}
  {svgEl}
  on:grab={(e) => ongrab?.(e.detail)}
  on:change={(e) => handleChange(e.detail)}
  on:release={(e) => onrelease?.(e.detail)}
>
  {#snippet children({ grab })}
    <!-- Body drag area -->
    <rect
      class="a9s-inner a9s-shape-handle"
      x={geom.x}
      y={geom.y}
      width={geom.w}
      height={geom.h}
      onpointerdown={grab("SHAPE")}
    />

    <!-- Edge handles (invisible rectangles for easier grabbing) -->
    <rect
      class="a9s-edge-handle a9s-edge-handle-top"
      x={geom.x}
      y={geom.y}
      height={1}
      width={geom.w}
      onpointerdown={grab("TOP")}
    />

    <rect
      class="a9s-edge-handle a9s-edge-handle-right"
      x={geom.x + geom.w}
      y={geom.y}
      height={geom.h}
      width={1}
      onpointerdown={grab("RIGHT")}
    />

    <rect
      class="a9s-edge-handle a9s-edge-handle-bottom"
      x={geom.x}
      y={geom.y + geom.h}
      height={1}
      width={geom.w}
      onpointerdown={grab("BOTTOM")}
    />

    <rect
      class="a9s-edge-handle a9s-edge-handle-left"
      x={geom.x}
      y={geom.y}
      height={geom.h}
      width={1}
      onpointerdown={grab("LEFT")}
    />

    <!-- Corner handles -->
    <Handle
      class="a9s-corner-handle-topleft"
      onpointerdown={grab("TOP_LEFT")}
      x={geom.x}
      y={geom.y}
      scale={viewportScale}
    />

    <Handle
      class="a9s-corner-handle-topright"
      onpointerdown={grab("TOP_RIGHT")}
      x={geom.x + geom.w}
      y={geom.y}
      scale={viewportScale}
    />

    <Handle
      class="a9s-corner-handle-bottomright"
      onpointerdown={grab("BOTTOM_RIGHT")}
      x={geom.x + geom.w}
      y={geom.y + geom.h}
      scale={viewportScale}
    />

    <Handle
      class="a9s-corner-handle-bottomleft"
      onpointerdown={grab("BOTTOM_LEFT")}
      x={geom.x}
      y={geom.y + geom.h}
      scale={viewportScale}
    />
  {/snippet}
</Editor>

<style>
  .a9s-inner {
    fill: rgba(49, 130, 237, 0.25);
    stroke: #3182ed;
    stroke-width: 1.5px;
    vector-effect: non-scaling-stroke;
    cursor: move;
    pointer-events: all;
  }

  .a9s-edge-handle {
    fill: transparent;
    stroke: transparent;
    pointer-events: all;
    stroke-width: 8px;
  }

  .a9s-edge-handle-top,
  .a9s-edge-handle-bottom {
    cursor: ns-resize;
  }

  .a9s-edge-handle-left,
  .a9s-edge-handle-right {
    cursor: ew-resize;
  }
</style>
