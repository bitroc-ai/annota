<script lang="ts">
  interface Props {
    children: import("svelte").Snippet;
  }
  let { children }: Props = $props();
</script>

<div class="nextra-tab">
  {@render children()}
</div>
