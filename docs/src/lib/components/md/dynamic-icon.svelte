<script lang="ts">
  import * as LucideIcons from "lucide-svelte";
  import type { Component } from "svelte";

  interface Props {
    name: string;
    class?: string;
  }

  let { name, class: className }: Props = $props();
  let Icon = $derived((LucideIcons as any)[name] as Component<any>);
</script>

{#if Icon}
  <Icon class={className} />
{/if}

