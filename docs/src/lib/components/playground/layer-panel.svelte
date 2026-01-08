<script lang="ts">
  import {
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Star,
    Download,
    Layers,
  } from "lucide-svelte";
  import { toastSuccess, toastError, toastInfo } from "$lib/services/toast";
  import { layerManager, getAnnotator, type Annotation } from "annota/svelte";
  import { exportMasksToPng } from "annota";
  import { cn } from "$lib/utils";
  import * as Popover from "$lib/components/ui/popover";

  interface Props {
    activeLayerId?: string;
    onActiveLayerChange?: (layerId: string) => void;
    imageVisible?: boolean;
    onImageVisibleChange?: (visible: boolean) => void;
  }

  let {
    activeLayerId,
    onActiveLayerChange,
    imageVisible = true,
    onImageVisibleChange,
  }: Props = $props();

  const getAnnotatorFn = getAnnotator();
  const annotator = $derived(getAnnotatorFn());
  const layerManagerInstance = layerManager();

  let open = $state(false);

  async function handleExportLayer(layerId: string, layerName: string) {
    if (!annotator) return;

    try {
      const layer = annotator.getLayer(layerId);
      if (!layer) {
        toastError("Layer not found");
        return;
      }

      const allAnnotations = annotator.state.store.all();
      const layerAnnotations = allAnnotations.filter((ann: Annotation) => {
        if (!layer.filter) return false;
        return layer.filter(ann);
      });

      if (layerAnnotations.length === 0) {
        toastInfo("No annotations in this layer to export");
        return;
      }

      if (!annotator.viewer) {
        toastError("Viewer not available");
        return;
      }

      const tiledImage = annotator.viewer.world.getItemAt(0);
      if (!tiledImage) {
        toastError("No image loaded");
        return;
      }

      const width = tiledImage.source.dimensions.x;
      const height = tiledImage.source.dimensions.y;

      toastInfo("Exporting mask layer...");
      const pngData = await exportMasksToPng(layerAnnotations, width, height);

      const blob = new Blob([pngData], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${layerName.replace(/\s+/g, "_")}_mask.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toastSuccess(`Exported ${layerAnnotations.length} mask(s) to PNG`);
    } catch (error) {
      console.error("Failed to export layer:", error);
      toastError("Failed to export layer");
    }
  }

  const sortedLayers = $derived(
    [...layerManagerInstance.layers]
      .filter((layer) => layer.id !== "image")
      .sort((a, b) => b.zIndex - a.zIndex)
  );
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    class="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
    title="Layers"
  >
    <Layers class="w-4 h-4" />
  </Popover.Trigger>
  <Popover.Content
    class="w-[320px] p-0"
    side="right"
    align="start"
    sideOffset={8}
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800"
    >
      <h3 class="text-sm font-semibold">Layers</h3>
      <Popover.Close
        class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        aria-label="Close layers panel"
      >
        ×
      </Popover.Close>
    </div>

    <!-- Layer List -->
    <div class="max-h-[400px] overflow-y-auto">
      <!-- Image Layer -->
      <div
        class="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800"
      >
        <div class="flex items-center gap-2">
          <button
            onclick={() => onImageVisibleChange?.(!imageVisible)}
            class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            title={imageVisible ? "Hide image" : "Show image"}
          >
            {#if imageVisible}
              <Eye class="w-4 h-4 text-blue-500" />
            {:else}
              <EyeOff class="w-4 h-4 text-slate-400" />
            {/if}
          </button>
          <span class="flex-1 text-sm font-semibold">Image</span>
          <span class="text-xs text-slate-500">Background</span>
        </div>
      </div>

      <!-- Annotation Layers -->
      {#if sortedLayers.length === 0}
        <div class="px-4 py-6 text-center text-sm text-slate-500">
          No annotation layers
        </div>
      {:else}
        <div class="py-1">
          {#each sortedLayers as layer (layer.id)}
            {@const isActive = activeLayerId === layer.id}
            <div
              class={cn(
                "px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative",
                isActive && "bg-slate-100 dark:bg-slate-800"
              )}
            >
              {#if isActive}
                <div
                  class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                ></div>
              {/if}

              <div class="flex items-center gap-2 mb-2">
                <button
                  onclick={() => onActiveLayerChange?.(layer.id)}
                  class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title={isActive ? "Active layer" : "Set as active layer"}
                >
                  <Star
                    class={cn(
                      "w-4 h-4",
                      isActive
                        ? "text-blue-500 fill-blue-500"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    )}
                  />
                </button>

                <button
                  onclick={() =>
                    layerManagerInstance.setLayerVisibility(
                      layer.id,
                      !layer.visible
                    )}
                  class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {#if layer.visible}
                    <Eye class="w-4 h-4 text-blue-500" />
                  {:else}
                    <EyeOff class="w-4 h-4 text-slate-400" />
                  {/if}
                </button>

                <button
                  onclick={() =>
                    layerManagerInstance.setLayerLocked(
                      layer.id,
                      !layer.locked
                    )}
                  class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                >
                  {#if layer.locked}
                    <Lock class="w-4 h-4 text-orange-500" />
                  {:else}
                    <Unlock class="w-4 h-4 text-slate-400" />
                  {/if}
                </button>

                <span
                  class={cn(
                    "flex-1 text-sm truncate",
                    isActive && "text-blue-600 dark:text-blue-400 font-semibold"
                  )}
                >
                  {layer.name}
                </span>

                {#if layer.id === "positive-masks" || layer.id === "negative-masks"}
                  <button
                    onclick={() => handleExportLayer(layer.id, layer.name)}
                    class="p-1 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition-colors"
                    title="Export layer as PNG mask"
                  >
                    <Download
                      class="w-4 h-4 text-green-600 dark:text-green-500"
                    />
                  </button>
                {/if}
              </div>

              <!-- Opacity Slider -->
              <div class="flex items-center gap-2 ml-10">
                <span class="text-xs text-slate-500 w-16">Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={layer.opacity}
                  oninput={(e) =>
                    layerManagerInstance.setLayerOpacity(
                      layer.id,
                      parseFloat(e.currentTarget.value)
                    )}
                  class="flex-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <span class="text-xs text-slate-500 w-8 text-right">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
