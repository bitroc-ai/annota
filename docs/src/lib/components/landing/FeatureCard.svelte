<script lang="ts">
  import type { Snippet, Component } from "svelte";

  interface Props {
    icon?: Component<any>;
    title: string;
    description: string;
    variant?: "default" | "ghost";
    children?: Snippet;
  }

  let { icon, title, description, variant = "default", children }: Props = $props();

  let isGhost = $derived(variant === "ghost");
</script>

<div
  class="group relative p-6 rounded-2xl transition-all duration-300 {isGhost
    ? 'bg-transparent border border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
    : 'bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1'}"
>
  {#if icon || children}
    <div
      class="mb-4 inline-flex p-3 rounded-xl transition-colors duration-300 {isGhost
        ? 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
        : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40'}"
    >
      {#if children}
        {@render children()}
      {:else if icon}
        {@const Icon = icon}
        <Icon class="w-6 h-6" />
      {/if}
    </div>
  {/if}
  <h3
    class="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
  >
    {title}
  </h3>
  <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
    {description}
  </p>
</div>
