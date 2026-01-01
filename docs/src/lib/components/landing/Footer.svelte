<script lang="ts">
</script>

<footer
  class="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800"
>
  <div class="container mx-auto px-6 py-12">
    <div class="flex flex-col md:flex-row justify-between items-center gap-6">
      <div class="flex items-center gap-3">
        <img
          src="/logo.svg"
          alt="Annota"
          class="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity brightness-0 dark:brightness-100 dark:invert"
        />
        <p class="text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} BitRoc AI.
        </p>
      </div>
      <div class="flex gap-8">
        <a
          href="https://github.com/bitroc-ai/annota"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          GitHub
        </a>
        <a
          href="https://github.com/bitroc-ai/annota/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Issues
        </a>
        <a
          href="/docs/changelog"
          class="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Changelog
        </a>
      </div>
    </div>
  </div>
</footer>
