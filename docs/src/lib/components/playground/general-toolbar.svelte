<script lang="ts">
  import {
    ZoomIn,
    ZoomOut,
    Maximize2,
    Undo,
    Redo,
    FileJson,
    Eraser,
  } from "lucide-svelte";
  import { toastSuccess, toastInfo } from "$lib/services/toast";
  import { getAnnotator, viewer as viewerUtils, history } from "annota/svelte";
  import { downloadJson, exportJson } from "annota";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";

  interface Props {
    viewer?: any;
  }

  let { viewer }: Props = $props();

  const getAnnotatorFn = getAnnotator();
  const annotator = $derived(getAnnotatorFn());
  const viewerControls = $derived(viewerUtils(viewer));
  const historyInstance = history();

  function handleExportJson() {
    if (!annotator) return;
    const annotations = annotator.state.store.all();
    if (annotations.length === 0) {
      toastInfo("No annotations to export");
      return;
    }
    const json = exportJson(annotations);
    downloadJson(json, "annotations.geojson");
    toastSuccess(`Exported ${annotations.length} annotations to JSON`);
  }

  function handleClearAll() {
    if (!annotator) return;
    const annotations = annotator.state.store.all();
    if (annotations.length === 0) {
      toastInfo("No annotations to clear");
      return;
    }
    if (confirm(`Clear all ${annotations.length} annotation(s)?`)) {
      annotator.clearAnnotations();
      toastSuccess("All annotations cleared");
    }
  }
</script>

<Card class="p-2 backdrop-blur-sm bg-white/95 dark:bg-slate-950/95">
  <div class="flex flex-row items-center gap-1">
    <!-- Zoom Controls -->
    <Button
      variant="ghost"
      size="icon"
      onclick={() => viewerControls.zoomIn()}
      class="w-9 h-9"
      title="Zoom in"
    >
      <ZoomIn class="w-4 h-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onclick={() => viewerControls.zoomOut()}
      class="w-9 h-9"
      title="Zoom out"
    >
      <ZoomOut class="w-4 h-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onclick={() => viewerControls.zoomToFit()}
      class="w-9 h-9"
      title="Fit to screen"
    >
      <Maximize2 class="w-4 h-4" />
    </Button>

    <!-- Divider -->
    <div class="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1" />

    <!-- History Controls -->
    <Button
      variant="ghost"
      size="icon"
      onclick={historyInstance.undo}
      disabled={!historyInstance.canUndo}
      class="w-9 h-9"
      title={`Undo ${historyInstance.canUndo ? `(${historyInstance.undoSize})` : ""}`}
    >
      <Undo class="w-4 h-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onclick={historyInstance.redo}
      disabled={!historyInstance.canRedo}
      class="w-9 h-9"
      title={`Redo ${historyInstance.canRedo ? `(${historyInstance.redoSize})` : ""}`}
    >
      <Redo class="w-4 h-4" />
    </Button>

    <!-- Divider -->
    <div class="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1" />

    <!-- File Operations -->
    <Button
      variant="ghost"
      size="icon"
      onclick={handleExportJson}
      class="w-9 h-9 hover:bg-green-50 dark:hover:bg-green-950/20"
      title="Export annotations as GeoJSON"
    >
      <FileJson class="w-4 h-4 text-green-600 dark:text-green-500" />
    </Button>
    <Button
      variant="secondary"
      size="icon"
      onclick={handleClearAll}
      class="w-9 h-9 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
      title="Clear all annotations"
    >
      <Eraser class="w-4 h-4" />
    </Button>
  </div>
</Card>
