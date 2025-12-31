<script lang="ts">
  import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-svelte";

  interface Props {
    type?: "default" | "info" | "warning" | "error" | "success";
    emoji?: string;
    children: import("svelte").Snippet;
  }

  let { type = "default", emoji, children }: Props = $props();

  const icons = {
    default: Info,
    info: Info,
    warning: AlertTriangle,
    error: XCircle,
    success: CheckCircle,
  };

  const colors = {
    default:
      "bg-orange-50 text-orange-800 dark:bg-orange-400/20 dark:text-orange-300 border-orange-100 dark:border-orange-400/30",
    info: "bg-blue-50 text-blue-800 dark:bg-blue-400/20 dark:text-blue-300 border-blue-100 dark:border-blue-400/30",
    warning:
      "bg-yellow-50 text-yellow-800 dark:bg-yellow-400/20 dark:text-yellow-300 border-yellow-100 dark:border-yellow-400/30",
    error:
      "bg-red-50 text-red-800 dark:bg-red-400/20 dark:text-red-300 border-red-100 dark:border-red-400/30",
    success:
      "bg-green-50 text-green-800 dark:bg-green-400/20 dark:text-green-300 border-green-100 dark:border-green-400/30",
  };
</script>

<div
  class="nextra-callout overflow-x-auto mt-6 flex rounded-lg border py-4 pr-4 pl-3 {colors[
    type
  ]}"
>
  <div class="select-none text-xl ltr:mr-3 rtl:ml-3 pl-1">
    {#if emoji}
      {emoji}
    {:else}
      {@const Icon = icons[type]}
      <Icon class="w-5 h-5 mt-1" />
    {/if}
  </div>
  <div class="w-full min-w-0 leading-7">
    {@render children()}
  </div>
</div>
