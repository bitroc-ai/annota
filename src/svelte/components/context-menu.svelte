<script lang="ts">
  import { type Snippet } from "svelte";

  interface ContextMenuPosition {
    x: number;
    y: number;
  }

  interface Props {
    position: ContextMenuPosition | null;
    children: Snippet;
    onClose?: () => void;
    class?: string;
    zIndex?: number;
  }

  let {
    position,
    children,
    onClose,
    class: className = "",
    zIndex = 10000,
  }: Props = $props();

  let menuElement: HTMLDivElement | undefined = $state(undefined);

  // Adjust position logic
  $effect(() => {
    if (!position || !menuElement) return;

    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > viewportWidth) {
      adjustedX = Math.max(10, viewportWidth - rect.width - 10);
    }

    if (position.y + rect.height > viewportHeight) {
      adjustedY = Math.max(10, viewportHeight - rect.height - 10);
    }

    menuElement.style.left = `${adjustedX}px`;
    menuElement.style.top = `${adjustedY}px`;
  });

  // Escape key
  $effect(() => {
    if (!position) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  });
</script>

{#if position}
  <!-- Overlay -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: {zIndex -
      1}; pointer-events: auto;"
    onclick={onClose}
    oncontextmenu={(e) => e.stopPropagation()}
  ></div>

  <!-- Menu -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={menuElement}
    class="annota-context-menu {className}"
    style="position: fixed; left: {position.x}px; top: {position.y}px; z-index: {zIndex}; pointer-events: auto; white-space: nowrap;"
    onclick={(e) => e.stopPropagation()}
    oncontextmenu={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
  >
    {@render children()}
  </div>
{/if}
