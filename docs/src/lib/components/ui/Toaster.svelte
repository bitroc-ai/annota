<script lang="ts">
  import { getToasts } from "$lib/services/toast";
  import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-svelte";

  const toasts = getToasts();

  function getIcon(type: string) {
    switch (type) {
      case "success":
        return CheckCircle2;
      case "error":
        return XCircle;
      case "warning":
        return AlertTriangle;
      default:
        return Info;
    }
  }

  function getStyles(type: string) {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200";
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200";
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
    }
  }

  function dismiss(id: string) {
    toasts.update((ts) => ts.filter((t) => t.id !== id));
  }
</script>

<div
  class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
  role="region"
  aria-label="Notifications"
>
  {#each toasts as toast (toast.id)}
    {@const Icon = getIcon(toast.type)}
    {@const styles = getStyles(toast.type)}
    <div
      class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm min-w-[300px] max-w-md {styles}"
    >
      <Icon class="w-5 h-5 shrink-0" />
      <p class="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onclick={() => dismiss(toast.id)}
        class="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>
