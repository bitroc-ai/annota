<script lang="ts">
  import Sidebar from "./Sidebar.svelte";
  interface Props {
    children?: import("svelte").Snippet;
    currentPath?: string;
  }
  let { children, currentPath }: Props = $props();
</script>

<div class="flex w-full min-h-[calc(100vh-4rem)]">
  <Sidebar {currentPath} />
  <main class="flex-1 min-w-0 py-8 px-6 lg:px-10 xl:px-12 dark:bg-[#0a0f1a]">
    <!-- Content rendered by Astro slot -->
    {@render children?.()}
  </main>
</div>
