<script lang="ts">
  import {
    getAnnotator,
    contextMenu,
    contextMenuBinding,
    ContextMenu,
    ContextMenuItem,
    ContextMenuDivider,
  } from "annota/svelte";
  import { SquareCheck, CircleCheck, Trash2 } from "lucide-svelte";
  import type { Annotation } from "annota/svelte";

  const getAnnotatorFn = getAnnotator();
  const { menuState, showViewerMenu, showAnnotationMenu, hideMenu } =
    contextMenu();

  contextMenuBinding(showViewerMenu, showAnnotationMenu);

  function handleSetPositive() {
    const annotator = getAnnotatorFn();
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        classification: "positive",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    hideMenu();
  }

  function handleSetNegative() {
    const annotator = getAnnotatorFn();
    if (!menuState.annotation || !annotator) return;

    const updated: Annotation = {
      ...menuState.annotation,
      properties: {
        ...menuState.annotation.properties,
        classification: "negative",
      },
    };

    annotator.updateAnnotation(menuState.annotation.id, updated);
    hideMenu();
  }

  function handleDelete() {
    const annotator = getAnnotatorFn();
    if (!menuState.annotation || !annotator) return;

    annotator.deleteAnnotation(menuState.annotation.id);
    hideMenu();
  }

  let isPositive = $derived(
    menuState.annotation?.properties?.classification === "positive"
  );
  let isNegative = $derived(
    menuState.annotation?.properties?.classification === "negative"
  );
</script>

<ContextMenu position={menuState.position} onClose={hideMenu}>
  {#if menuState.type === "annotation" && menuState.annotation}
    <ContextMenuItem
      icon={SquareCheck}
      label="Mark as Positive"
      onClick={handleSetPositive}
      disabled={isPositive}
    />
    <ContextMenuItem
      icon={CircleCheck}
      label="Mark as Negative"
      onClick={handleSetNegative}
      disabled={isNegative}
    />
    <ContextMenuDivider />
    <ContextMenuItem
      icon={Trash2}
      label="Delete"
      onClick={handleDelete}
      danger
    />
  {/if}
</ContextMenu>
