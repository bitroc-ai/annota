<script lang="ts">
  import { Github, Menu, X } from "lucide-svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import { sidebarOpen } from "../../stores/sidebar";

  function toggleSidebar() {
    sidebarOpen.update((open) => !open);
  }

  // Use $state.runes for store subscription in Svelte 5
  let isOpen = $state(false);

  $effect(() => {
    const unsubscribe = sidebarOpen.subscribe((value) => {
      isOpen = value;
    });
    return () => unsubscribe();
  });
</script>

<nav
  class="sticky top-0 z-50 w-full border-b backdrop-blur-xl"
  style="border-color: var(--border); background-color: color-mix(in srgb, var(--background) 80%, transparent);"
>
  <div class="w-full px-6 h-16 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <!-- Hamburger menu for mobile -->
      <button
        type="button"
        onclick={toggleSidebar}
        class="lg:hidden p-2 rounded-md transition-all nav-link"
        aria-label="Toggle sidebar"
        aria-expanded={isOpen}
      >
        {#if isOpen}
          <X class="w-5 h-5" />
        {:else}
          <Menu class="w-5 h-5" />
        {/if}
      </button>

      <a href="/" class="flex items-center gap-2.5 group">
        <img
          src="/logo.svg"
          alt="Annota"
          class="h-6 w-auto brightness-0 dark:brightness-100 dark:invert transition-transform group-hover:scale-105"
        />
        <span class="font-semibold text-lg" style="color: var(--foreground);"
          >Annota</span
        >
      </a>

      <div class="hidden md:flex items-center gap-1 text-sm font-medium">
        <a href="/docs" class="px-3 py-1.5 rounded-md transition-all nav-link"
          >Docs</a
        >
        <a
          href="/playground"
          class="px-3 py-1.5 rounded-md transition-all nav-link">Playground</a
        >
        <a href="/api" class="px-3 py-1.5 rounded-md transition-all nav-link"
          >API</a
        >
      </div>
    </div>

    <div class="flex items-center gap-2">
      <ThemeSwitcher />
      <a
        href="https://github.com/bitroc-ai/annota"
        target="_blank"
        rel="noreferrer"
        class="p-2 rounded-md transition-all nav-link"
        aria-label="GitHub"
      >
        <Github class="w-5 h-5" />
      </a>
    </div>
  </div>
</nav>
