<script lang="ts">
  import DocsLayout from "$lib/components/layout/DocsLayout.svelte";
  let { children } = $props();
</script>

<DocsLayout>
  {@render children()}
</DocsLayout>
