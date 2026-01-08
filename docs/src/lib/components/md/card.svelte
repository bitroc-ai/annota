<script lang="ts">
  import { ArrowRight } from "lucide-svelte";

  interface Props {
    title: string;
    icon?: import("svelte").Snippet | any; // support lucide component or snippet
    href: string;
    children?: import("svelte").Snippet;
  }

  let { title, icon: Icon, href, children }: Props = $props();
</script>

<a
  {href}
  class="group flex flex-col justify-start overflow-hidden rounded-lg border border-gray-200 bg-transparent text-current no-underline shadow-sm shadow-gray-100 transition-all duration-200 hover:border-gray-300 hover:bg-slate-50 hover:shadow-md dark:border-neutral-700 dark:shadow-none dark:hover:border-neutral-500 dark:hover:bg-neutral-900"
>
  {#if Icon}
    <div class="p-4 text-gray-700 dark:text-neutral-200">
      <!-- If Icon is component -->
      {#if typeof Icon === "object" || typeof Icon === "function"}
        <svelte:component this={Icon} class="w-6 h-6" />
      {:else}
        {@render Icon()}
      {/if}
    </div>
  {/if}
  <div class="flex-1 p-4 pt-0">
    <div class="font-semibold">{title}</div>
    {#if children}<div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {@render children()}
      </div>{/if}
  </div>
</a>
