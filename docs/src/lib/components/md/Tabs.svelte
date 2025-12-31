<script lang="ts">
  import { setContext } from "svelte";
  import { writable } from "svelte/store";

  interface Props {
    items: string[];
    children: import("svelte").Snippet;
  }

  let { items, children }: Props = $props();

  // Use Svelte 5 state
  let selectedIndex = $state(0);

  // Provide context for child Tab components if needed, or better,
  // Nextra usage: <Tabs items={...}><Tab>...</Tab><Tab>...</Tab></Tabs>
  // Tab components render content. We need to show only the selected Tab's content.
  // BUT in Svelte, snippets are passed.
  // If `<Tab>` is a component, it renders inside the slot.
  // We can hide/show based on index.
  // But `<Tab>` doesn't know its index unless we pass it or count it.
  // Counting children in Svelte slot is hard.

  // Alternative: Use context to register tabs?
  // Or: Just use CSS/logic.
  // Simpler approach:
  // <Tabs items={['A', 'B']}>
  //    <Tab>Content A</Tab>
  //    <Tab>Content B</Tab>
  // </Tabs>

  // We can use a store/context to communicate current index.
  // And each Tab registers itself? No order guarantee in registration vs rendering.

  // If we change usages to:
  // <Tabs items={['A', 'B']} contents={[snipA, snipB]} /> ? No, MDX passes children.

  // Workaround: We provide a context with the current selected index.
  // The Tab component reads the context. EACH Tab must know "I am index 0" or "1".
  // Without manual index prop in MDX, Tab must infer order.
  // This is tricky in Svelte slots without hacking internals.

  // Nextra's <Tab> is just a container?
  // Actually Nextra implementation: https://nextra.site/docs/guide/built-ins/tabs
  // It uses React children mapping.

  // In Svelte, we can iterate over snippets if passed as prop, but here `children` is a single snippet.
  // We can rely on CSS: Render ALL tabs, hide those not selected?
  // But we need to know which one corresponds to which button.
  // Assume: order of rendering matches order of items.

  // Solution: Context with a counter?
  // No, re-renders might mess up counter.

  // Robust solution for Svelte:
  // We can't easily auto-index slots in Svelte 5 yet.
  // However, for typical docs usage, maybe we just styling?
  // We can wrap children in a div, and use `:nth-child` CSS to show/hide based on selected state?
  // That seems cleanest for "Porting" without changing MDX content structure.

  // Logic:
  // Provide `selectedIndex` store context.
  // Render tabs buttons.
  // Render children in a container with class `tabs-content`.
  // CSS: `.tabs-content > :nth-child(k)` display block/none based on selected.
  // But Svelte components inside slot might add extra wrapper divs.

  // Let's try CSS-based toggling.
  // We need to pass the selected index to CSS variable?

  // Store approach for generic usage:
  // const index = writable(0);
  // setContext('tabs', index);

  // But how does Tab know its index?
  // It doesn't.

  // Since we are migrating, we can write a generic `Tab` that renders `div` with `hidden` class unless active.
  // But determining active is the hard part.

  // WAIT. Nextra Tabs MDX usage:
  // <Tabs items={['nap', 'yarn']}>
  //   <Tabs.Tab> ... </Tabs.Tab>
  //   <Tabs.Tab> ... </Tabs.Tab>
  // </Tabs>

  // If we assume standard MDX structure, we can parse this.
  // But here `children` function returns DocumentFragment/nodes.

  // Let's go with a simpler Svelte-specific Tabs component if we can change MDX.
  // But task is to minimize MDX changes.

  // Hack: Use `bind:this` on container and count children on mount?
  // Then toggle visibility.

  // Implementation:
  // Render buttons.
  // Render contents.
  // In `onMount` or `effect`, grab container children.
  // Apply `display: none` to all except `selectedIndex`.

  let container: HTMLDivElement | undefined = $state(undefined);

  $effect(() => {
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    children.forEach((child, idx) => {
      child.style.display = idx === selectedIndex ? "block" : "none";
      // Add animation/transition if desired
    });
  });
</script>

<div class="nextra-tabs mt-4">
  <div
    class="overflow-x-auto overflow-y-hidden overscroll-x-contain pb-px mb-2 -ml-2"
  >
    <div
      class="flex gap-2 border-b border-gray-200 dark:border-neutral-800 pb-px"
    >
      {#each items as item, i}
        <button
          onclick={() => (selectedIndex = i)}
          class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px hover:bg-gray-100 hover:text-black dark:hover:bg-neutral-800 dark:hover:text-white
                {selectedIndex === i
            ? 'border-blue-500 text-blue-600 dark:border-blue-500 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/10'
            : 'border-transparent text-gray-600 dark:text-gray-400'}"
        >
          {item}
        </button>
      {/each}
    </div>
  </div>

  <div
    bind:this={container}
    class="rounded-xl border border-gray-200 dark:border-neutral-800 p-4"
  >
    {@render children()}
  </div>
</div>
