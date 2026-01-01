<script lang="ts">
  import OpenSeadragon from "openseadragon";
  import type { Annotation, Bounds } from "../../core/types";
  import type {
    PopupPosition,
    PopupAnchor,
    PopupOptions,
  } from "../../react/types";

  interface Props {
    viewer: OpenSeadragon.Viewer | undefined;
    annotation: Annotation | null;
    children: import("svelte").Snippet;
    options?: PopupOptions;
    onClose?: () => void;
  }

  let { viewer, annotation, children, options = {}, onClose }: Props = $props();

  let position: PopupPosition | null = $state(null);
  let popupElement: HTMLDivElement | undefined = $state(undefined);
  let autoHideTimer: number | null = null;

  const {
    anchor = "top-center",
    offset = { x: 0, y: -10 },
    autoHideDelay = 0,
    hoverStayOpen = true,
  } = $derived(options);

  // Helper function (Ported from React)
  function calculatePopupPosition(
    viewer: OpenSeadragon.Viewer,
    bounds: Bounds,
    anchor: PopupAnchor = "top-center",
    offset = { x: 0, y: -10 },
    el?: HTMLDivElement,
  ): PopupPosition {
    const { minX, minY, maxX, maxY } = bounds;
    let effectiveAnchor = anchor;

    if (el) {
      const popupHeight = el.offsetHeight || 200;
      const popupWidth = el.offsetWidth || 250;

      const centerImageX = (minX + maxX) / 2;
      const centerImageY = (minY + maxY) / 2;
      const centerViewport = viewer.viewport.imageToViewportCoordinates(
        centerImageX,
        centerImageY,
      );
      const centerWindow =
        viewer.viewport.viewportToWindowCoordinates(centerViewport);

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      if (anchor.includes("bottom")) {
        if (
          centerWindow.y + Math.abs(offset.y) + popupHeight >
          viewportHeight - 20
        ) {
          effectiveAnchor = anchor.replace("bottom", "top") as PopupAnchor;
        }
      } else if (anchor.includes("top")) {
        if (centerWindow.y - Math.abs(offset.y) - popupHeight < 20) {
          effectiveAnchor = anchor.replace("top", "bottom") as PopupAnchor;
        }
      }

      if (centerWindow.x - popupWidth / 2 < 20) {
        effectiveAnchor = effectiveAnchor
          .replace("center", "left")
          .replace("right", "left") as PopupAnchor;
      } else if (centerWindow.x + popupWidth / 2 > viewportWidth - 20) {
        effectiveAnchor = effectiveAnchor
          .replace("center", "right")
          .replace("left", "right") as PopupAnchor;
      }
    }

    let anchorImageX: number;
    let anchorImageY: number;

    switch (effectiveAnchor) {
      case "top-left":
        anchorImageX = minX;
        anchorImageY = minY;
        break;
      case "top-center":
        anchorImageX = (minX + maxX) / 2;
        anchorImageY = minY;
        break;
      case "top-right":
        anchorImageX = maxX;
        anchorImageY = minY;
        break;
      case "bottom-left":
        anchorImageX = minX;
        anchorImageY = maxY;
        break;
      case "bottom-center":
        anchorImageX = (minX + maxX) / 2;
        anchorImageY = maxY;
        break;
      case "bottom-right":
        anchorImageX = maxX;
        anchorImageY = maxY;
        break;
      case "center":
        anchorImageX = (minX + maxX) / 2;
        anchorImageY = (minY + maxY) / 2;
        break;
      default:
        anchorImageX = minX;
        anchorImageY = minY;
    }

    const viewportPoint = viewer.viewport.imageToViewportCoordinates(
      anchorImageX,
      anchorImageY,
    );
    const windowPoint =
      viewer.viewport.viewportToWindowCoordinates(viewportPoint);

    let adjustedOffsetY = offset.y;
    if (effectiveAnchor !== anchor) {
      if (
        (anchor.includes("top") && effectiveAnchor.includes("bottom")) ||
        (anchor.includes("bottom") && effectiveAnchor.includes("top"))
      ) {
        adjustedOffsetY = -offset.y;
      }
    }

    let transform: string;
    if (effectiveAnchor.includes("top")) {
      if (effectiveAnchor.includes("left")) transform = "translate(0%, -100%)";
      else if (effectiveAnchor.includes("right"))
        transform = "translate(-100%, -100%)";
      else transform = "translate(-50%, -100%)";
    } else if (effectiveAnchor.includes("bottom")) {
      if (effectiveAnchor.includes("left")) transform = "translate(0%, 0%)";
      else if (effectiveAnchor.includes("right"))
        transform = "translate(-100%, 0%)";
      else transform = "translate(-50%, 0%)";
    } else {
      transform = "translate(-50%, -50%)";
    }

    return {
      x: windowPoint.x + offset.x,
      y: windowPoint.y + adjustedOffsetY,
      anchorX: windowPoint.x,
      anchorY: windowPoint.y,
      transform,
    };
  }

  function updatePosition() {
    if (!viewer || !annotation) {
      position = null;
      return;
    }
    const bounds = annotation.shape.bounds;
    const newPos = calculatePopupPosition(
      viewer,
      bounds,
      anchor,
      offset,
      popupElement,
    );
    // Simple diff check could be added here if performace issues arise
    position = newPos;
  }

  $effect(() => {
    if (!viewer || !annotation) {
      position = null;
      return;
    }

    // Initial
    updatePosition();

    const events = ["animation", "pan", "zoom", "resize", "rotate"];
    events.forEach((e) => viewer.addHandler(e as any, updatePosition));

    return () => {
      events.forEach((e) => viewer.removeHandler(e as any, updatePosition));
    };
  });

  // Auto hide
  $effect(() => {
    if (autoHideDelay > 0 && annotation) {
      if (autoHideTimer) clearTimeout(autoHideTimer);
      autoHideTimer = window.setTimeout(() => {
        onClose?.();
      }, autoHideDelay);
    }
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  });

  function handleMouseEnter() {
    if (hoverStayOpen && autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }
  }

  function handleMouseLeave() {
    if (hoverStayOpen && autoHideDelay > 0) {
      autoHideTimer = window.setTimeout(() => onClose?.(), autoHideDelay);
    }
  }
</script>

```
{#if annotation && position}
  <!-- Overlay -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; pointer-events: auto;"
    onclick={onClose}
  ></div>

  <!-- Popup -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={popupElement}
    style="position: fixed; left: {position.x}px; top: {position.y}px; transform: {position.transform}; z-index: 10001; pointer-events: auto;"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    {@render children()}
  </div>
{/if}
