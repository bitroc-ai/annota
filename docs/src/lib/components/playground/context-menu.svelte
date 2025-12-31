<script lang="ts">
  import {
    getAnnotator,
    contextMenu,
    contextMenuBinding,
    editing,
    ContextMenu,
    ContextMenuItem,
    ContextMenuDivider,
    type Annotation,
  } from "annota/svelte";
  import { getEditorConfig } from "annota";
  import { toastSuccess } from "$lib/services/toast";
  import {
    CircleDot,
    SquareDot,
    Trash2,
    Edit3,
    SquareCheck,
    CircleCheck,
  } from "lucide-svelte";
  
  const getAnnotatorFn = getAnnotator();
  const annotator = $derived(getAnnotatorFn());
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } =
    contextMenu();
  const { startEditing, isEditing } = editing();
  
  contextMenuBinding(showViewerMenu, showAnnotationMenu);
  
  function handleSetPositiveMask() {
    if (!menuState.annotation || !annotator) return;
    
    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        classification: "positive",
        layer: "positive-masks",
      },
    };
    
    annotator.updateAnnotation(menuState.annotation.id, updated);
    toastSuccess("Set as positive mask (include)");
    hideMenu();
  }
  
  function handleSetNegativeMask() {
    if (!menuState.annotation || !annotator) return;
    
    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        classification: "negative",
        layer: "negative-masks",
      },
    };
    
    annotator.updateAnnotation(menuState.annotation.id, updated);
    toastSuccess("Set as negative mask (exclude)");
    hideMenu();
  }
  
  function handleSetPositivePoint() {
    if (!menuState.annotation || !annotator) return;
    
    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        category: "positive",
      },
    };
    
    annotator.updateAnnotation(menuState.annotation.id, updated);
    toastSuccess("Set as positive point (include)");
    hideMenu();
  }
  
  function handleSetNegativePoint() {
    if (!menuState.annotation || !annotator) return;
    
    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        category: "negative",
      },
    };
    
    annotator.updateAnnotation(menuState.annotation.id, updated);
    toastSuccess("Set as negative point (exclude)");
    hideMenu();
  }
  
  function handleDelete() {
    if (!menuState.annotation || !annotator) return;
    annotator.deleteAnnotation(menuState.annotation.id);
    toastSuccess("Annotation deleted");
    hideMenu();
  }
  
  function handleClearAll() {
    if (!annotator) return;
    annotator.clearAnnotations();
    toastSuccess("All annotations cleared");
    hideMenu();
  }
  
  function handleEditVertices() {
    if (!menuState.annotation) return;
    startEditing(menuState.annotation.id);
    toastSuccess("Vertex editing mode enabled");
    hideMenu();
  }
  
  const isMaskAnnotation = $derived(
    menuState.annotation &&
      (menuState.annotation.shape.type === "polygon" ||
        menuState.annotation.shape.type === "multipolygon" ||
        menuState.annotation.shape.type === "path")
  );
  
  const isPointAnnotation = $derived(
    menuState.annotation && menuState.annotation.shape.type === "point"
  );
  
  const isCurrentlyPositiveMask = $derived(
    !!(
      menuState.annotation?.properties?.classification === "positive" ||
      (isMaskAnnotation && !menuState.annotation?.properties?.classification)
    )
  );
  
  const isCurrentlyNegativeMask = $derived(
    !!(menuState.annotation?.properties?.classification === "negative")
  );
  
  const isCurrentlyPositivePoint = $derived(
    !!(menuState.annotation?.properties?.category === "positive")
  );
  
  const isCurrentlyNegativePoint = $derived(
    !!(menuState.annotation?.properties?.category === "negative")
  );
  
  const supportsVertexEditing = $derived(
    menuState.annotation
      ? getEditorConfig(menuState.annotation)?.supportsVertexEditing
      : false
  );
  
  const isCurrentlyEditing = $derived(
    menuState.annotation ? isEditing(menuState.annotation.id) : false
  );
</script>

<ContextMenu position={menuState.position} onClose={hideMenu}>
  {#if menuState.type === "annotation" && menuState.annotation}
    {#if isMaskAnnotation}
      <div class="annota-context-menu-header">Mask Actions</div>
      <ContextMenuItem
        label={
          isCurrentlyPositiveMask ? "Positive Mask" : "Set as Positive Mask"
        }
        onclick={handleSetPositiveMask}
        disabled={isCurrentlyPositiveMask}
      >
        {#snippet icon()}
          {#if isCurrentlyPositiveMask}
            <SquareCheck class="w-4 h-4 text-green-500" />
          {:else}
            <SquareDot class="w-4 h-4 text-green-500" />
          {/if}
        {/snippet}
      </ContextMenuItem>
      <ContextMenuItem
        label={
          isCurrentlyNegativeMask ? "Negative Mask" : "Set as Negative Mask"
        }
        onclick={handleSetNegativeMask}
        disabled={isCurrentlyNegativeMask}
      >
        {#snippet icon()}
          {#if isCurrentlyNegativeMask}
            <SquareCheck class="w-4 h-4 text-red-500" />
          {:else}
            <SquareDot class="w-4 h-4 text-red-500" />
          {/if}
        {/snippet}
      </ContextMenuItem>
      <ContextMenuDivider />
      <ContextMenuItem
        label="Delete Annotation"
        onclick={handleDelete}
        danger
      >
        {#snippet icon()}
          <Trash2 class="w-4 h-4" />
        {/snippet}
      </ContextMenuItem>
    {:else if isPointAnnotation}
      <div class="annota-context-menu-header">Point Actions</div>
      <ContextMenuItem
        label={
          isCurrentlyPositivePoint ? "Positive Point" : "Set as Positive Point"
        }
        onclick={handleSetPositivePoint}
        disabled={isCurrentlyPositivePoint}
      >
        {#snippet icon()}
          {#if isCurrentlyPositivePoint}
            <CircleCheck class="w-4 h-4 text-green-500" />
          {:else}
            <CircleDot class="w-4 h-4 text-green-500" />
          {/if}
        {/snippet}
      </ContextMenuItem>
      <ContextMenuItem
        label={
          isCurrentlyNegativePoint ? "Negative Point" : "Set as Negative Point"
        }
        onclick={handleSetNegativePoint}
        disabled={isCurrentlyNegativePoint}
      >
        {#snippet icon()}
          {#if isCurrentlyNegativePoint}
            <CircleCheck class="w-4 h-4 text-red-500" />
          {:else}
            <CircleDot class="w-4 h-4 text-red-500" />
          {/if}
        {/snippet}
      </ContextMenuItem>
      <ContextMenuDivider />
      <ContextMenuItem
        label="Delete Annotation"
        onclick={handleDelete}
        danger
      >
        {#snippet icon()}
          <Trash2 class="w-4 h-4" />
        {/snippet}
      </ContextMenuItem>
    {:else}
      <div class="annota-context-menu-header">Annotation Actions</div>
      {#if supportsVertexEditing}
        <ContextMenuItem
          label={isCurrentlyEditing ? "Editing Vertices" : "Edit Vertices"}
          onclick={handleEditVertices}
          disabled={isCurrentlyEditing}
        >
          {#snippet icon()}
            <Edit3 class="w-4 h-4 text-blue-500" />
          {/snippet}
        </ContextMenuItem>
        <ContextMenuDivider />
      {/if}
      <ContextMenuItem
        label="Delete Annotation"
        onclick={handleDelete}
        danger
      >
        {#snippet icon()}
          <Trash2 class="w-4 h-4" />
        {/snippet}
      </ContextMenuItem>
    {/if}
  {:else if menuState.type === "viewer"}
    <div class="annota-context-menu-header">Viewer Actions</div>
    <ContextMenuItem
      label="Clear All Annotations"
      onclick={handleClearAll}
      danger
    >
      {#snippet icon()}
        <Trash2 class="w-4 h-4" />
      {/snippet}
    </ContextMenuItem>
  {/if}
</ContextMenu>

