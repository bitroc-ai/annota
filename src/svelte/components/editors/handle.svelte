<script lang="ts">
  /**
   * Handle - Interactive SVG Circle
   *
   * Renders an SVG circle handle for annotation editing.
   * Includes hit buffer for easier clicking.
   * Ported from annotorious/src/annotation/editors/Handle.svelte
   */

  interface Props {
    x: number;
    y: number;
    scale: number;
    selected?: boolean;
    class?: string;
    onpointerdown?: (evt: PointerEvent) => void;
  }

  let {
    x,
    y,
    scale,
    selected = false,
    class: className = "",
    onpointerdown,
  }: Props = $props();

  let touched = $state(false);

  // Check if touch device
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

  const handlePointerDown = (evt: PointerEvent) => {
    if (evt.pointerType === "touch") touched = true;
    onpointerdown?.(evt);
  };

  const handlePointerUp = () => {
    touched = false;
  };

  const handleRadius = $derived(4 / scale);
</script>

{#if isTouch}
  <g class="a9s-touch-handle">
    <circle
      cx={x}
      cy={y}
      r={handleRadius * 10}
      class="a9s-touch-halo"
      class:touched
    />

    <circle
      cx={x}
      cy={y}
      r={handleRadius + 10 / scale}
      class="a9s-handle-buffer"
      role="button"
      tabindex="0"
      onpointerdown={handlePointerDown}
      onpointerup={handlePointerUp}
    />

    <circle class="a9s-handle-dot" cx={x} cy={y} r={handleRadius + 2 / scale} />
  </g>
{:else}
  <g class={`a9s-handle ${className}`.trim()}>
    <circle
      class="a9s-handle-buffer"
      cx={x}
      cy={y}
      r={handleRadius + 6 / scale}
      role="button"
      tabindex="0"
      onpointerdown={handlePointerDown}
      onpointerup={handlePointerUp}
    />

    {#if selected}
      <circle
        class="a9s-handle-selected"
        cx={x}
        cy={y}
        r={handleRadius + 8 / scale}
      />
    {/if}

    <circle
      class={`a9s-handle-dot${selected ? " selected" : ""}`}
      cx={x}
      cy={y}
      r={handleRadius}
    />
  </g>
{/if}

<style>
  .a9s-handle-buffer {
    fill: transparent;
    cursor: pointer;
    pointer-events: all;
  }

  .a9s-handle-buffer:focus {
    outline: none;
  }

  .a9s-handle-buffer:focus-visible {
    stroke: rgba(255, 255, 255, 0.8);
    stroke-width: 3px;
  }

  .a9s-handle-dot {
    fill: white;
    stroke: #3182ed;
    stroke-width: 1.5px;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }

  .a9s-handle-dot.selected {
    fill: #3182ed;
  }

  .a9s-handle-selected {
    fill: rgba(49, 130, 237, 0.25);
    stroke: none;
    pointer-events: none;
  }

  .a9s-touch-halo {
    fill: rgba(49, 130, 237, 0.1);
    stroke: none;
    pointer-events: none;
  }

  .a9s-touch-halo.touched {
    fill: rgba(49, 130, 237, 0.25);
  }
</style>
