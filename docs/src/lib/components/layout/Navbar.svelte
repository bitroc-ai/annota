<script lang="ts">
  import { Github } from "lucide-svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
</script>

<nav
  class="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-[#0a0f1a]/80 backdrop-blur-xl"
>
  <div class="w-full px-6 h-16 flex items-center justify-between">
    <div class="flex items-center gap-8">
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
