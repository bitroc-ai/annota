<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    onClick?: () => void;
    icon?: Snippet; // Or generic snippet
    disabled?: boolean;
    danger?: boolean;
    class?: string;
  }

  let {
    label,
    onClick,
    icon,
    disabled = false,
    danger = false,
    class: className = "",
  }: Props = $props();

  function handleClick() {
    if (!disabled && onClick) {
      onClick();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="annota-context-menu-item {className}"
  onclick={handleClick}
  data-disabled={disabled}
  data-danger={danger}
>
  {#if icon}
    <span class="menu-item-icon">{@render icon()}</span>
  {/if}
  <span class="menu-item-label">{label}</span>
</div>
