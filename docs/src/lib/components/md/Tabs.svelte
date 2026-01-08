<script lang="ts">
  import { setContext } from "svelte";

  interface Props {
    items: string[];
    children: import("svelte").Snippet;
  }

  let { items, children }: Props = $props();

  // Use Svelte 5 state for selected index
  let selectedIndex = $state(0);

  // Track tab indices using a counter that increments as tabs are rendered
  let tabCounter = $state(0);

  // Provide context for Tab components
  const TABS_CONTEXT_KEY = Symbol("tabs");
  setContext(TABS_CONTEXT_KEY, {
    get selectedIndex() {
      return selectedIndex;
    },
    get items() {
      return items;
    },
    registerTab: () => {
      const index = tabCounter;
      tabCounter++;
      return index;
    },
  });
</script>

<div class="nextra-tabs mt-4">
  <!-- Tab Navigation -->
  <div
    class="overflow-x-auto overflow-y-hidden overscroll-x-contain pb-px mb-2 -ml-2"
  >
    <div
      class="flex gap-2 border-b border-gray-200 dark:border-neutral-800 pb-px"
    >
      {#each items as item, i}
        <button
          type="button"
          onclick={() => (selectedIndex = i)}
          class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px hover:bg-gray-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white
                {selectedIndex === i
            ? 'border-blue-500 text-blue-600 dark:border-blue-500 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/10'
            : 'border-transparent text-gray-600 dark:text-gray-400'}"
          aria-selected={selectedIndex === i}
          aria-controls={`tab-panel-${i}`}
          role="tab"
        >
          {item}
        </button>
      {/each}
    </div>
  </div>

  <!-- Tab Content -->
  <div
    class="rounded-xl border border-gray-200 dark:border-neutral-800 p-4 mt-2"
    role="tabpanel"
  >
    {@render children()}
  </div>
</div>
