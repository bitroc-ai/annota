<script lang="ts">
  import {
    Hand,
    CircleDot,
    Wand2,
    Sparkles,
    FileJson,
    Scissors,
    Merge,
    Image as ImageIcon,
    LineSquiggle,
    Loader2,
    Square,
    Pentagon,
  } from "lucide-svelte";
  import { toastSuccess, toastError, toastInfo } from "$lib/services/toast";
  import {
    getAnnotator,
    selection,
  } from "annota/svelte";
  import { containsPoint, downloadJson, exportJson, canMergeAnnotations } from "annota";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import { cn } from "$lib/utils";
  import { warmUpSamApi } from "$lib/services/sam-warmup";
  
  export type ToolType =
    | "pan"
    | "point"
    | "rectangle"
    | "polygon"
    | "curve"
    | "sam"
    | "push"
    | "split";
  
  interface Props {
    tool: ToolType;
    onToolChange: (tool: ToolType) => void;
    viewer?: any;
    samInitializing?: boolean;
    layerPanel?: import("svelte").Snippet;
  }
  
  let {
    tool,
    onToolChange,
    viewer,
    samInitializing = false,
    layerPanel,
  }: Props = $props();
  
  const getAnnotatorFn = getAnnotator();
  const annotator = $derived(getAnnotatorFn());
  const selectedAnnotations = selection();
  
  function handleAddImageAnnotation() {
    if (!annotator || !viewer) return;
    
    const viewport = viewer.viewport;
    const center = viewport.getCenter();
    const imageCenter = viewport.viewportToImageCoordinates(center);
    
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const gradient = ctx.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, "rgba(255, 100, 100, 0.7)");
    gradient.addColorStop(1, "rgba(100, 100, 255, 0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Analysis", 32, 28);
    ctx.fillText("Result", 32, 42);
    
    const imageData = canvas.toDataURL("image/png");
    
    const annotation = {
      id: `image-${Date.now()}`,
      shape: {
        type: "image" as const,
        x: imageCenter.x - 32,
        y: imageCenter.y - 32,
        width: 64,
        height: 64,
        url: imageData,
        opacity: 0.6,
        bounds: {
          minX: imageCenter.x - 32,
          minY: imageCenter.y - 32,
          maxX: imageCenter.x + 32,
          maxY: imageCenter.y + 32,
        },
      },
      properties: {
        type: "analysis_result",
        analysisType: "sample",
        timestamp: Date.now(),
      },
    };
    
    annotator.state.store.add(annotation);
    toastSuccess("Added sample image annotation at viewport center");
  }
  
  function handleMerge() {
    if (!annotator) return;
    
    const selectedIds = annotator.state.selection.getSelected();
    if (selectedIds.length < 2) {
      toastInfo("Select 2 or more annotations to merge");
      return;
    }
    
    const annotations = selectedIds
      .map((id) => annotator.state.store.get(id))
      .filter((ann) => ann !== undefined);
    
    if (!canMergeAnnotations(annotations as any[])) {
      toastError("Cannot merge selected annotations (incompatible types)");
      return;
    }
    
    const merged = annotator.mergeSelected();
    if (merged) {
      toastSuccess(`Merged ${selectedIds.length} annotations into one`);
    } else {
      toastError("Failed to merge annotations");
    }
  }
  
  function handleAutoAssignMasks() {
    if (!annotator) return;
    
    const allAnnotations = annotator.state.store.all();
    const pointAnnotations = allAnnotations.filter(
      (ann) => ann.shape.type === "point"
    );
    const maskAnnotations = allAnnotations.filter(
      (ann) =>
        ann.shape.type === "polygon" ||
        ann.shape.type === "multipolygon" ||
        ann.shape.type === "path"
    );
    
    if (maskAnnotations.length === 0) {
      toastInfo("No mask annotations to assign");
      return;
    }
    
    if (pointAnnotations.length === 0) {
      toastInfo("No point annotations found");
      return;
    }
    
    let assignedCount = 0;
    
    maskAnnotations.forEach((mask) => {
      let hasPositive = false;
      let hasNegative = false;
      
      pointAnnotations.forEach((point) => {
        if (point.shape.type !== "point") return;
        
        const isInside = containsPoint(
          mask.shape,
          point.shape.point.x,
          point.shape.point.y
        );
        
        if (isInside) {
          const category = point.properties?.category;
          if (category === "positive") {
            hasPositive = true;
          } else if (category === "negative") {
            hasNegative = true;
          }
        }
      });
      
      const currentClassification = mask.properties?.classification;
      let newClassification: "positive" | "negative" | undefined =
        currentClassification;
      
      if (hasPositive) {
        newClassification = "positive";
      } else if (hasNegative) {
        newClassification = "negative";
      }
      
      if (newClassification !== currentClassification) {
        annotator.updateAnnotation(mask.id, {
          ...mask,
          properties: {
            ...mask.properties,
            classification: newClassification,
          },
        });
        assignedCount++;
      }
    });
    
    if (assignedCount > 0) {
      toastSuccess(`Auto-assigned ${assignedCount} mask(s) to layers`);
    } else {
      toastInfo("All masks already correctly assigned");
    }
  }
</script>

<Card class="p-2 backdrop-blur-sm bg-white/95 dark:bg-slate-950/95">
  <div class="flex flex-col items-center gap-1">
    <!-- Drawing Tools -->
    <Button
      variant={tool === "pan" ? "default" : "ghost"}
      size="icon"
      onclick={() => onToolChange("pan")}
      class="w-9 h-9"
      title="Pan and zoom"
    >
      <Hand class="w-4 h-4" />
    </Button>
    <Button
      variant={tool === "point" ? "default" : "ghost"}
      size="icon"
      onclick={() => onToolChange("point")}
      class={cn("w-9 h-9", tool === "point" && "bg-blue-600 hover:bg-blue-700")}
      title="Add point markers"
    >
      <CircleDot class="w-4 h-4" />
    </Button>
    <Button
      variant={tool === "rectangle" ? "default" : "ghost"}
      size="icon"
      onclick={() => onToolChange("rectangle")}
      class={cn("w-9 h-9", tool === "rectangle" && "bg-blue-600 hover:bg-blue-700")}
      title="Draw rectangles"
    >
      <Square class="w-4 h-4" />
    </Button>
    <Button
      variant={tool === "polygon" ? "default" : "ghost"}
      size="icon"
      onclick={() => onToolChange("polygon")}
      class={cn("w-9 h-9", tool === "polygon" && "bg-blue-600 hover:bg-blue-700")}
      title="Draw polygons (double-click to finish)"
    >
      <Pentagon class="w-4 h-4" />
    </Button>
    <Button
      variant={tool === "curve" ? "default" : "ghost"}
      size="icon"
      onclick={() => onToolChange("curve")}
      class={cn("w-9 h-9", tool === "curve" && "bg-blue-600 hover:bg-blue-700")}
      title="Draw smooth curves (freehand)"
    >
      <LineSquiggle class="w-4 h-4" />
    </Button>
    <Button
      variant={tool === "sam" ? "default" : "ghost"}
      size="icon"
      onclick={() => {
        warmUpSamApi();
        onToolChange("sam");
      }}
      class={cn("w-9 h-9", tool === "sam" && "bg-purple-600 hover:bg-purple-700")}
      title={samInitializing ? "SAM Initializing..." : "SAM Segmentation (click on objects)"}
    >
      {#if samInitializing}
        <Loader2 class="w-4 h-4 animate-spin" />
      {:else}
        <Wand2 class="w-4 h-4" />
      {/if}
    </Button>
    <Button
      variant={tool === "split" ? "default" : "ghost"}
      size="icon"
      onclick={() => onToolChange("split")}
      class={cn("w-9 h-9", tool === "split" && "bg-orange-600 hover:bg-orange-700")}
      title="Split annotation with a line"
    >
      <Scissors class="w-4 h-4" />
    </Button>
    
    <!-- Divider -->
    <div class="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1"></div>

    <!-- Annotation Operations -->
    <Button
      variant="ghost"
      size="icon"
      onclick={handleAddImageAnnotation}
      disabled={!annotator || !viewer}
      class="w-9 h-9 hover:bg-purple-50 dark:hover:bg-purple-950/20 disabled:opacity-50"
      title="Add sample image annotation (analysis result overlay)"
    >
      <ImageIcon class="w-4 h-4 text-purple-600 dark:text-purple-500" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onclick={handleMerge}
      disabled={!annotator || selectedAnnotations.length < 2}
      class="w-9 h-9 hover:bg-blue-50 dark:hover:bg-blue-950/20 disabled:opacity-50"
      title="Merge selected annotations"
    >
      <Merge class="w-4 h-4 text-blue-600 dark:text-blue-500" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onclick={handleAutoAssignMasks}
      class="w-9 h-9 hover:bg-purple-50 dark:hover:bg-purple-950/20"
      title="Auto-assign masks to layers based on contained points"
    >
      <Sparkles class="w-4 h-4 text-purple-500" />
    </Button>

    <!-- Divider -->
    <div class="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1"></div>

    <!-- Layer Panel -->
    {#if layerPanel}
      {@render layerPanel()}
    {/if}
  </div>
</Card>

