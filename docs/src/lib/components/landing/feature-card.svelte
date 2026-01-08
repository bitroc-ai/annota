<script lang="ts">
  import type { Snippet, Component } from "svelte";
  import * as LucideIcons from "lucide-svelte";

  interface Props {
    icon?: Component<any>;
    iconName?: string;
    title: string;
    description: string;
    variant?: "default" | "ghost";
    children?: Snippet;
  }

  let { icon, iconName, title, description, variant = "default", children }: Props = $props();

  let isGhost = $derived(variant === "ghost");
  let resolvedIcon = $derived(icon || (iconName && (LucideIcons[iconName as keyof typeof LucideIcons] as Component<any>)));
</script>

<div
  class="group relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 feature-card"
  style="background-color: var(--background); border: 1px solid var(--border);"
>
  {#if resolvedIcon || children}
    <div
      class="mb-4 inline-flex p-3 rounded-xl transition-colors duration-300 feature-card-icon"
      style="color: var(--primary); background-color: color-mix(in srgb, var(--primary) 10%, transparent);"
    >
      {#if children}
        {@render children()}
      {:else if resolvedIcon}
        {@const Icon = resolvedIcon}
        <Icon class="w-6 h-6" />
      {/if}
    </div>
  {/if}
  <h3
    class="text-lg font-semibold mb-2 transition-colors feature-card-title"
    style="color: var(--foreground);"
  >
    {title}
  </h3>
  <p class="text-sm leading-relaxed" style="color: var(--muted-foreground);">
    {description}
  </p>
</div>

<style>
  .feature-card:hover {
    border-color: var(--primary);
    box-shadow: 0 20px 25px -5px color-mix(in srgb, var(--primary) 10%, transparent),
      0 8px 10px -6px color-mix(in srgb, var(--primary) 10%, transparent);
  }

  .feature-card:hover .feature-card-icon {
    background-color: color-mix(in srgb, var(--primary) 15%, transparent);
  }

  .feature-card:hover .feature-card-title {
    color: var(--primary);
  }
</style>
