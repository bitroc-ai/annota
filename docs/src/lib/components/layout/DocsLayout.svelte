<script lang="ts">
  import Sidebar from "./Sidebar.svelte";
  interface Props {
    children?: import("svelte").Snippet;
  }
  let { children }: Props = $props();
</script>

<div class="flex container mx-auto max-w-360">
  <Sidebar />
  <main class="flex-1 min-w-0 py-10 px-6 lg:px-10 xl:px-12 dark:bg-slate-950">
    <!-- Prose for markdown content -->
    <div class="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
      {@render children?.()}
    </div>
  </main>
</div>
