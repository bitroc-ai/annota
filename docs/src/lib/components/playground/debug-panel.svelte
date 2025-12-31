<script lang="ts">
  import { ChevronRight } from "lucide-svelte";
  import { annotations } from "annota/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  
  interface Props {
    currentImage: string;
    onNextImage: () => void;
  }
  
  let { currentImage, onNextImage }: Props = $props();
  
  const annotationsList = annotations();
</script>

<div class="absolute top-2 right-2 z-10">
  <div class="bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 backdrop-blur p-1 rounded-md flex items-center gap-3 shadow-sm">
    <span class="text-xs">
      Annotations: <span class="font-mono">{annotationsList.length}</span>
    </span>
    <div class="w-px h-4 bg-slate-200 dark:bg-slate-800" />
    <Button
      variant="ghost"
      size="sm"
      onclick={onNextImage}
      class="h-6 px-2 text-xs"
      title={`Next image (${currentImage})`}
    >
      <ChevronRight class="w-3 h-3" />
      {currentImage}
    </Button>
  </div>
</div>

