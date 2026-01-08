<script lang="ts">
  import { docsConfig, type NavItem } from "../../config/docs";
  import { sidebarOpen } from "../../stores/sidebar";

  interface Props {
    currentPath?: string;
  }

  let { currentPath = typeof window !== 'undefined' ? window.location.pathname : '' }: Props = $props();

  let isOpen = $state(false);
  
  // Subscribe to store
  $effect(() => {
    const unsubscribe = sidebarOpen.subscribe((value) => {
      isOpen = value;
    });
    return () => unsubscribe();
  });

  function isActive(href?: string) {
    if (!href) return false;
    return currentPath === href || currentPath.startsWith(href + "/");
  }

  function handleLinkClick() {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth < 1024) {
      sidebarOpen.set(false);
    }
  }

  function closeSidebar() {
    sidebarOpen.set(false);
  }
</script>

<!-- Mobile overlay -->
{#if isOpen}
  <div
    class="fixed inset-0 bg-black/50 z-40 lg:hidden"
    onclick={closeSidebar}
    onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
    role="button"
    tabindex="-1"
    aria-label="Close sidebar"
  ></div>
{/if}

<!-- Sidebar -->
<aside
  class="fixed lg:sticky top-16 left-0 z-40 lg:z-auto w-64 xl:w-72 h-[calc(100vh-4rem)] sidebar-scroll border-r py-6 px-4 transition-transform duration-300 ease-in-out {isOpen
    ? 'translate-x-0'
    : '-translate-x-full lg:translate-x-0'} lg:block"
  style="background-color: var(--background); border-color: var(--border);"
>
  <div class="space-y-8">
    {#each docsConfig as group}
      <div class="space-y-2">
        {#if group.items}
          <h4
            class="font-semibold text-xs uppercase tracking-wider px-3 mb-2"
            style="color: var(--muted-foreground);"
          >
            {group.title}
          </h4>
          <div class="space-y-0.5">
            {#each group.items as item}
              <a
                href={item.href}
                class="sidebar-link {isActive(item.href) ? 'active' : ''}"
                onclick={handleLinkClick}
              >
                {item.title}
              </a>
            {/each}
          </div>
        {:else}
          <a
            href={group.href}
            class="block font-semibold text-sm px-3 py-1.5 rounded-md transition-colors sidebar-group-link {isActive(group.href) ? 'active' : ''}"
            onclick={handleLinkClick}
          >
            {group.title}
          </a>
        {/if}
      </div>
    {/each}
  </div>
</aside>
