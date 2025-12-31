<script lang="ts">
  interface Props {
    num?: number;
    children: import("svelte").Snippet;
  }
  let { num = 3, children }: Props = $props();
</script>

<div
  class="mt-4 gap-4 grid grid-cols-1 md:grid-cols-{Math.min(
    num,
    2,
  )} lg:grid-cols-{num}"
>
  {@render children()}
</div>
