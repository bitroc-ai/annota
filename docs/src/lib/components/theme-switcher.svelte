<script lang="ts">
  import { Moon, Sun } from "lucide-svelte";

  let currentTheme = $state<'light' | 'dark'>('light');

  function getTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('starlight-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme: 'light' | 'dark') {
    if (typeof window === 'undefined') return;
    localStorage.setItem('starlight-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    currentTheme = theme;

    // Dispatch custom event for same-page listeners
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // Initialize theme and set up listeners
  $effect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize theme
    currentTheme = getTheme();
    setTheme(currentTheme);

    // Listen for storage events (from other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'starlight-theme') {
        const newTheme = (e.newValue || 'light') as 'light' | 'dark';
        currentTheme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    // Listen for custom theme-change events (from same page)
    const handleThemeChange = ((e: CustomEvent) => {
      currentTheme = e.detail.theme;
    }) as EventListener;

    window.addEventListener('storage', handleStorage);
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  });
</script>

<button
  onclick={toggleTheme}
  class="theme-switcher"
  aria-label="Toggle theme"
  title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if currentTheme === 'dark'}
    <Sun class="icon" />
  {:else}
    <Moon class="icon" />
  {/if}
</button>

<style>
  .theme-switcher {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--sl-color-gray-2);
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .theme-switcher:hover {
    color: var(--sl-color-text);
    background: var(--sl-color-gray-6);
  }

  .theme-switcher :global(.icon) {
    width: 1.125rem;
    height: 1.125rem;
  }
</style>

