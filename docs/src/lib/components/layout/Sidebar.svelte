<script lang="ts">
  import { docsConfig, type NavItem } from "$lib/config/docs";
  import { page } from "$app/stores";

  let currentPath = $derived($page.url.pathname);

  function isActive(href?: string) {
    if (!href) return false;
    return currentPath === href || currentPath.startsWith(href + "/");
  }
</script>

<aside
  class="hidden lg:block w-64 xl:w-72 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto border-r border-slate-200 dark:border-slate-800 py-6 px-4 bg-white dark:bg-slate-950"
>
  <div class="space-y-6">
    {#each docsConfig as group}
      <div class="space-y-3">
        {#if group.items}
          <h4
            class="font-semibold text-sm text-slate-900 dark:text-slate-100 px-2"
          >
            {group.title}
          </h4>
          <div class="space-y-1">
            {#each group.items as item}
              <a
                href={item.href}
                class="block px-2 py-1.5 text-sm rounded-md transition-colors {currentPath ===
                item.href
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-300'}"
              >
                {item.title}
              </a>
            {/each}
          </div>
        {:else}
          <a
            href={group.href}
            class="block font-semibold text-sm text-slate-900 dark:text-slate-100 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md {currentPath ===
            group.href
              ? 'text-blue-600 dark:text-blue-400'
              : ''}"
          >
            {group.title}
          </a>
        {/if}
      </div>
    {/each}
  </div>
</aside>
