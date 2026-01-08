<script lang="ts">
  import { Laptop, Moon, Sun } from "lucide-svelte";

  type Theme = 'auto' | 'light' | 'dark';

  let currentTheme = $state<Theme>('auto');
  let isOpen = $state(false);

  function getTheme(): Theme {
    if (typeof window === 'undefined') return 'auto';
    const stored = localStorage.getItem('starlight-theme');
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return 'auto';
  }

  function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  function setTheme(theme: Theme) {
    if (typeof window === 'undefined') return;

    // Starlight stores auto as empty string, light/dark as-is
    const storageValue = theme === 'auto' ? '' : theme;
    localStorage.setItem('starlight-theme', storageValue);

    const effectiveTheme = getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    currentTheme = theme;
    isOpen = false;

    // Dispatch custom event for same-page listeners
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme, effectiveTheme } }));
  }

  function handleSelectChange(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    setTheme(select.value as Theme);
  }

  // Initialize theme and set up listeners
  $effect(() => {
    if (typeof window === 'undefined') return;

    // Initialize theme
    currentTheme = getTheme();
    const effectiveTheme = getEffectiveTheme(currentTheme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for storage events (from other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'starlight-theme') {
        const newTheme = getTheme();
        currentTheme = newTheme;
        const newEffectiveTheme = getEffectiveTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newEffectiveTheme);
        if (newEffectiveTheme === 'dark') {
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

    // Listen for system theme changes when in auto mode
    const handleSystemThemeChange = () => {
      if (currentTheme === 'auto') {
        const effectiveTheme = getEffectiveTheme('auto');
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        if (effectiveTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    window.addEventListener('storage', handleStorage);
    window.addEventListener('theme-change', handleThemeChange);
    darkModeQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('theme-change', handleThemeChange);
      darkModeQuery.removeEventListener('change', handleSystemThemeChange);
    };
  });
</script>

<div class="theme-switcher-wrapper">
  <select
    value={currentTheme}
    onchange={handleSelectChange}
    class="theme-switcher"
    aria-label="Select theme"
  >
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="auto">Auto</option>
  </select>
  <div class="theme-icon" aria-hidden="true">
    {#if currentTheme === 'dark'}
      <Moon class="icon" />
    {:else if currentTheme === 'light'}
      <Sun class="icon" />
    {:else}
      <Laptop class="icon" />
    {/if}
  </div>
</div>

<style>
  .theme-switcher-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .theme-switcher {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    padding-right: 2rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--sl-color-gray-2);
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .theme-switcher:hover {
    color: var(--sl-color-text);
    background: var(--sl-color-gray-6);
  }

  .theme-switcher:focus-visible {
    outline: 2px solid var(--sl-color-text);
    outline-offset: 2px;
  }

  .theme-icon {
    position: absolute;
    right: 0.5rem;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
  }

  .theme-icon :global(.icon) {
    width: 1rem;
    height: 1rem;
  }
</style>

