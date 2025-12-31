<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    text: string;
    children: Snippet;
    side?: "top" | "bottom" | "left" | "right";
  }

  let { text, children, side = "top" }: Props = $props();

  let visible = $state(false);
</script>

<div
  class="relative inline-block"
  onmouseenter={() => (visible = true)}
  onmouseleave={() => (visible = false)}
  role="tooltip"
>
  {@render children()}

  {#if visible}
    <div
      class="absolute z-50 px-2 py-1 text-xs text-white bg-slate-900 rounded shadow-lg whitespace-nowrap {side ===
      'top'
        ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
        : ''} {side === 'bottom'
        ? 'top-full left-1/2 -translate-x-1/2 mt-2'
        : ''}"
    >
      {text}
    </div>
  {/if}
</div>
