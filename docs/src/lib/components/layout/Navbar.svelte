<script lang="ts">
  import { Github } from "lucide-svelte";
</script>

<nav
  class="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
>
  <div class="container mx-auto px-4 h-16 flex items-center justify-between">
    <div class="flex items-center gap-6">
      <a href="/" class="flex items-center gap-2">
        <img
          src="/logo.svg"
          alt="Annota"
          class="h-6 w-auto brightness-0 dark:brightness-100 dark:invert"
        />
        <span class="font-semibold text-lg text-slate-900 dark:text-white"
          >Annota</span
        >
      </a>

      <div class="hidden md:flex items-center gap-6 text-sm font-medium">
        <a
          href="/docs"
          class="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >Documentation</a
        >
        <a
          href="/docs/guides"
          class="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >Guides</a
        >
        <a
          href="/playground"
          class="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >Playground</a
        >
        <a
          href="/api"
          class="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >API</a
        >
      </div>
    </div>

    <div class="flex items-center gap-4">
      <a
        href="https://github.com/bitroc-ai/annota"
        target="_blank"
        rel="noreferrer"
        class="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50 transition-colors"
      >
        <Github class="w-5 h-5" />
      </a>
    </div>
  </div>
</nav>
