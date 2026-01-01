<script lang="ts">
  import {
    AnnotaProvider,
    Annotator,
    Viewer as AnnotaViewer,
  } from "annota/svelte";
  import type { Annotation, AnnotationStyle } from "annota/svelte";
  import OpenSeadragon from "openseadragon";
  import AnnotationToolbar from "$lib/components/playground/toolbar.svelte";
  import GeneralToolbar from "$lib/components/playground/general-toolbar.svelte";
  import ToolManager from "$lib/components/playground/tool-manager.svelte";
  import LayerPanel from "$lib/components/playground/layer-panel.svelte";
  import DebugPanel from "$lib/components/playground/debug-panel.svelte";
  import ToolSettings from "$lib/components/playground/tool-settings.svelte";
  import AnnotationContextMenu from "$lib/components/playground/context-menu.svelte";
  import DemoContent from "$lib/components/playground/demo-content.svelte";
  import Toaster from "$lib/components/ui/Toaster.svelte";
  import type { ToolType } from "$lib/components/playground/toolbar";

  let viewer: OpenSeadragon.Viewer | undefined = $state(undefined);
  let currentImageIndex = $state(0);
  let tool: ToolType = $state("pan");
  let pushRadius = $state(30);
  let smoothingTolerance = $state(2);
  let activeLayerId = $state("default");
  let imageVisible = $state(true);
  let samInitializing = $state(false);

  const DEMO_IMAGES = ["0.png", "1.png", "2.png", "3.png", "4.png"];
  const currentImage = $derived(DEMO_IMAGES[currentImageIndex]);

  const viewerOptions = $derived({
    tileSources: {
      type: "image" as const,
      url: `/playground/images/test/${currentImage}`,
    },
    showNavigationControl: false,
    visibilityRatio: 1,
    minZoomLevel: 0.5,
    maxZoomLevel: 10,
    gestureSettingsMouse: {
      clickToZoom: false,
      dblClickToZoom: false,
    },
  });

  const categoryStyleFunction = (annotation: Annotation): AnnotationStyle => {
    const category = annotation.properties?.category as string | undefined;
    const classification = annotation.properties?.classification;

    if (classification === "negative") {
      return {
        fill: "#FF0000",
        fillOpacity: 0.4,
        stroke: "#FF6666",
        strokeOpacity: 1.0,
        strokeWidth: 2,
      };
    }

    if (classification === "positive") {
      return {
        fill: "#00FF00",
        fillOpacity: 0.3,
        stroke: "#66FF66",
        strokeOpacity: 1.0,
        strokeWidth: 2,
      };
    }

    if (category === "negative") {
      return {
        fill: "#FF0000",
        fillOpacity: 0.3,
        stroke: "#FF6666",
        strokeOpacity: 1.0,
        strokeWidth: 2,
      };
    }

    if (category === "positive") {
      return {
        fill: "#00FF00",
        fillOpacity: 0.25,
        stroke: "#FFFFFF",
        strokeOpacity: 1.0,
        strokeWidth: 2,
      };
    }

    return annotation.style || {};
  };

  function handleNextImage() {
    currentImageIndex = (currentImageIndex + 1) % DEMO_IMAGES.length;
  }

  // Apply image opacity when imageVisible changes
  $effect(() => {
    if (!viewer || imageVisible === undefined) return;

    const osdCanvas = viewer.element?.querySelector(".openseadragon-canvas");
    if (osdCanvas) {
      const imageCanvas = osdCanvas.querySelector(
        "canvas:not(.annota-pixi-canvas)"
      ) as HTMLElement;
      if (imageCanvas) {
        imageCanvas.style.opacity = imageVisible ? "1" : "0";
      }
    }
  });
</script>

<AnnotaProvider>
  <div class="h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-slate-950">
    <Toaster />
    <div class="relative h-full">
      <AnnotaViewer
        class="h-full"
        options={viewerOptions}
        onViewerReady={(v: OpenSeadragon.Viewer) => {
          viewer = v;
        }}
      />
      {#if viewer}
        <Annotator {viewer} style={categoryStyleFunction}>
          <ToolManager
            {viewer}
            {tool}
            {pushRadius}
            {smoothingTolerance}
            {activeLayerId}
            onSamInitializing={(init) => {
              samInitializing = init;
            }}
          />
          <AnnotationContextMenu />
          <DemoContent {currentImage} />
        </Annotator>
      {/if}

      <!-- Annotation Toolbar - Left side -->
      <div class="absolute top-4 left-4 bottom-4">
        <AnnotationToolbar
          {tool}
          onToolChange={(t) => {
            tool = t;
          }}
          {viewer}
          {samInitializing}
        >
          {#snippet layerPanel()}
            <LayerPanel
              {activeLayerId}
              onActiveLayerChange={(id) => {
                activeLayerId = id;
              }}
              {imageVisible}
              onImageVisibleChange={(visible) => {
                imageVisible = visible;
              }}
            />
          {/snippet}
        </AnnotationToolbar>
      </div>

      <!-- Tool Settings - Next to annotation toolbar -->
      <div class="absolute top-4 left-20">
        <ToolSettings
          {tool}
          {pushRadius}
          onPushRadiusChange={(r) => {
            pushRadius = r;
          }}
          {smoothingTolerance}
          onSmoothingToleranceChange={(t) => {
            smoothingTolerance = t;
          }}
        />
      </div>

      <!-- General Toolbar - Bottom right -->
      <div class="absolute bottom-4 right-4">
        <GeneralToolbar {viewer} />
      </div>

      <!-- Debug Panel - Top right -->
      <DebugPanel {currentImage} onNextImage={handleNextImage} />
    </div>
  </div>
</AnnotaProvider>
