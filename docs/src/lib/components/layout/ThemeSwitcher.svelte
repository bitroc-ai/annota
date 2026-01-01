<script lang="ts">
  import { Moon, Sun } from "lucide-svelte";
  import { onMount } from "svelte";

  let isDark = $state(false);
  let mounted = $state(false);

  function toggleTheme() {
    isDark = !isDark;
    const html = document.documentElement;
    
    if (isDark) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  onMount(() => {
    mounted = true;
    // Check localStorage first, then system preference
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (stored === "dark" || (!stored && prefersDark)) {
      isDark = true;
      document.documentElement.classList.add("dark");
    } else {
      isDark = false;
      document.documentElement.classList.remove("dark");
    }
  });
</script>

<button
  type="button"
  on:click={toggleTheme}
  class="p-2 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-all"
  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
>
  {#if mounted}
    {#if isDark}
      <Sun class="w-5 h-5" />
    {:else}
      <Moon class="w-5 h-5" />
    {/if}
  {:else}
    <!-- Placeholder to prevent layout shift -->
    <Moon class="w-5 h-5 opacity-0" />
  {/if}
</button>
