<script lang="ts">
  /**
   * Editor - Drag Wrapper for Shape Editing
   *
   * Handles pointer capture, delta calculation, and shape updates.
   * Wraps shape-specific editor components.
   * Ported from annotorious/src/annotation/editors/Editor.svelte
   */
  import { createEventDispatcher } from "svelte";
  import type OpenSeadragon from "openseadragon";
  import type { Shape } from "../../../core/types";
  import { pointerEventToImage } from "../../../adapters/openseadragon/coordinates";

  const dispatch = createEventDispatcher<{
    grab: PointerEvent;
    release: PointerEvent;
    change: Shape;
  }>();

  interface Props {
    shape: Shape;
    editor: (shape: Shape, handle: string, delta: [number, number]) => Shape;
    viewportScale: number;
    viewer: OpenSeadragon.Viewer;
    svgEl?: SVGSVGElement;
    children?: import("svelte").Snippet<
      [{ grab: (handle: string) => (evt: PointerEvent) => void }]
    >;
  }

  let {
    shape = $bindable(),
    editor,
    viewportScale: _viewportScale,
    viewer,
    svgEl: _svgEl,
    children,
  }: Props = $props();

  let grabbedHandle: string | undefined = $state(undefined);
  let origin: [number, number] | undefined = $state(undefined);
  let initialShape: Shape | undefined = $state(undefined);

  /**
   * Convert pointer event to image coordinates using OpenSeadragon's proper coordinate conversion
   */
  const getImageCoords = (evt: PointerEvent): [number, number] | undefined => {
    const point = pointerEventToImage(viewer, evt);
    if (!point) return undefined;
    return [point.x, point.y];
  };

  const onGrab = (handle: string) => (evt: PointerEvent) => {
    grabbedHandle = handle;

    // Get origin in image coordinates using OpenSeadragon's coordinate conversion
    origin = getImageCoords(evt);
    if (!origin) return;

    initialShape = shape;

    const target = evt.target as Element;
    target.setPointerCapture(evt.pointerId);

    dispatch("grab", evt);
  };

  const onPointerMove = (evt: PointerEvent) => {
    if (!grabbedHandle || !origin || !initialShape) return;

    // Get current position in image coordinates using OpenSeadragon's coordinate conversion
    const coords = getImageCoords(evt);
    if (!coords) return;

    const [x, y] = coords;
    const delta: [number, number] = [x - origin[0], y - origin[1]];

    shape = editor(initialShape, grabbedHandle, delta);

    dispatch("change", shape);
  };

  const onRelease = (evt: PointerEvent) => {
    const target = evt.target as Element;
    target.releasePointerCapture(evt.pointerId);

    grabbedHandle = undefined;
    initialShape = shape;

    dispatch("release", evt);
  };
</script>

<g
  class="a9s-annotation selected"
  onpointerup={onRelease}
  onpointermove={onPointerMove}
>
  {@render children?.({ grab: onGrab })}
</g>
