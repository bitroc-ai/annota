<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import type { ToolType } from "./toolbar";
  
  interface Props {
    tool: ToolType;
    pushRadius: number;
    onPushRadiusChange: (value: number) => void;
    smoothingTolerance: number;
    onSmoothingToleranceChange: (value: number) => void;
  }
  
  let {
    tool,
    pushRadius,
    onPushRadiusChange,
    smoothingTolerance,
    onSmoothingToleranceChange,
  }: Props = $props();
</script>

{#if tool === "curve"}
  <Card class="bg-white/95 dark:bg-slate-950/95 backdrop-blur">
    <div class="p-3 space-y-2">
      <h3 class="text-sm font-semibold">Curve Tool</h3>
      <label class="text-xs text-slate-600 dark:text-slate-400">
        Smoothness: {smoothingTolerance.toFixed(1)}
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={smoothingTolerance}
          oninput={(e) => onSmoothingToleranceChange(Number(e.currentTarget.value))}
          class="w-full mt-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
        />
        <div class="text-xs text-slate-500 dark:text-slate-500 mt-1">
          Lower = more detail, Higher = smoother
        </div>
      </label>
    </div>
  </Card>
{:else if tool === "sam"}
  <Card class="bg-white/95 dark:bg-slate-950/95 backdrop-blur">
    <div class="p-3 space-y-2">
      <h3 class="text-sm font-semibold">SAM Segmentation</h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Hover over objects to preview segmentation, click to create annotation.
      </p>
    </div>
  </Card>
{:else if tool === "push"}
  <Card class="bg-white/95 dark:bg-slate-950/95 backdrop-blur">
    <div class="p-3 space-y-2">
      <h3 class="text-sm font-semibold">Push Tool</h3>
      <label class="text-xs text-slate-600 dark:text-slate-400">
        Radius: {pushRadius}
        <input
          type="range"
          min="10"
          max="100"
          value={pushRadius}
          oninput={(e) => onPushRadiusChange(Number(e.currentTarget.value))}
          class="w-full mt-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
        />
      </label>
    </div>
  </Card>
{/if}

