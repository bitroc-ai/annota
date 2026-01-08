<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    children?: import("svelte").Snippet;
  }

  let { class: className, children, ...restProps }: Props = $props();
</script>

<div
  class={cn(
    "rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm",
    "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
