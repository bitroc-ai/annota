<script lang="ts">
  import { docsConfig, type NavItem } from "../../config/docs";

  interface Props {
    currentPath?: string;
  }

  let { currentPath = typeof window !== 'undefined' ? window.location.pathname : '' }: Props = $props();

  function isActive(href?: string) {
    if (!href) return false;
    return currentPath === href || currentPath.startsWith(href + "/");
  }
</script>

<aside
  class="hidden lg:block w-64 xl:w-72 h-[calc(100vh-4rem)] sticky top-16 sidebar-scroll border-r border-slate-200/60 dark:border-slate-800/60 py-6 px-4 bg-white dark:bg-[#0a0f1a]"
>
  <div class="space-y-8">
    {#each docsConfig as group}
      <div class="space-y-2">
        {#if group.items}
          <h4
            class="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mb-2"
          >
            {group.title}
          </h4>
          <div class="space-y-0.5">
            {#each group.items as item}
              <a
                href={item.href}
                class="sidebar-link {isActive(item.href) ? 'active' : ''}"
              >
                {item.title}
              </a>
            {/each}
          </div>
        {:else}
          <a
            href={group.href}
            class="block font-semibold text-sm text-slate-900 dark:text-slate-100 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900/50 rounded-md transition-colors {isActive(group.href)
              ? 'text-sky-600 dark:text-sky-400'
              : ''}"
          >
            {group.title}
          </a>
        {/if}
      </div>
    {/each}
  </div>
</aside>
