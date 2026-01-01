<script lang="ts">
  import { getContext } from "svelte";
  import { fade } from "svelte/transition";

  interface Props {
    children: import("svelte").Snippet;
    index?: number;
  }

  let { children, index }: Props = $props();

  // Get tabs context
  const TABS_CONTEXT_KEY = Symbol("tabs");
  const tabsContext = getContext<{
    selectedIndex: number;
    items: string[];
    registerTab: () => number;
  }>(TABS_CONTEXT_KEY);

  // Get or assign tab index
  let tabIndex = $state(
    index !== undefined ? index : tabsContext ? tabsContext.registerTab() : -1
  );

  // Determine if this tab should be visible
  let isActive = $derived(
    tabsContext && tabIndex >= 0
      ? tabIndex === tabsContext.selectedIndex
      : false
  );
</script>

{#if isActive}
  <div
    class="nextra-tab-content"
    id="tab-panel-{tabIndex}"
    role="tabpanel"
    transition:fade={{ duration: 150 }}
  >
    {@render children()}
  </div>
{/if}
