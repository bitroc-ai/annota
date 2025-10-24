"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  AnnotaProvider,
  AnnotaViewer,
  Annotator,
  useAnnotator,
  loadH5Coordinates,
  AnnotationEditor,
  type Annotation,
  type AnnotationStyle,
} from "annota";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { DemoToolbar } from "@/components/playground/toolbar";
import { ToolSettings } from "@/components/playground/tool-settings";
import { DebugPanel } from "@/components/playground/debug-panel";
import { ToolManager } from "@/components/playground/tool-manager";
import { PopupEditor } from "@/components/playground/popup-editor";
import { LayerPanel } from "@/components/playground/layer-panel";
import { Layers } from "lucide-react";
import type { ToolType } from "@/components/playground/toolbar";

const DEMO_IMAGES = ["0.png", "1.png", "2.png", "3.png", "4.png"];

/**
 * Load H5 annotations for a specific category
 */
async function loadH5AnnotationsByCategory(
  imageId: string,
  category: "positive" | "negative"
): Promise<Annotation[]> {
  const h5Path = `/playground/annotations/test/${category}/${imageId}.h5`;

  try {
    const annotations = await loadH5Coordinates(h5Path, {
      color: category === "positive" ? "#00FF00" : "#FF0000",
      fillOpacity: 0.8,
      strokeWidth: 1,
    });

    // Add category and layer to each annotation, and make IDs unique
    return annotations.map((ann) => ({
      ...ann,
      id: `${category}-${ann.id}`, // Prefix ID with category to avoid conflicts
      properties: {
        ...ann.properties,
        layer: `annotations-${category}`,
        category,
        source: "h5",
      },
    }));
  } catch (error) {
    console.warn(`No H5 file found or error loading: ${h5Path}`, error);
    return [];
  }
}

function DemoContent({ currentImage }: { currentImage: string }) {
  const annotator = useAnnotator();

  // Create layers on mount
  useEffect(() => {
    if (!annotator) return;

    // Create layer for positive annotations
    if (!annotator.getLayer("annotations-positive")) {
      annotator.createLayer("annotations-positive", {
        name: "Positive Annotations",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 10,
      });
    }

    // Create layer for negative annotations
    if (!annotator.getLayer("annotations-negative")) {
      annotator.createLayer("annotations-negative", {
        name: "Negative Annotations",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 11,
      });
    }
  }, [annotator]);

  // Load annotations when image changes
  useEffect(() => {
    if (!annotator || typeof window === "undefined") return;

    const loadAnnotations = async () => {
      const imageNumber = currentImage.replace(".png", "");

      // Clear existing H5 annotations from both layers
      const allAnnotations = annotator.state.store.all();
      const h5Annotations = allAnnotations.filter(
        (ann) => ann.properties?.source === "h5"
      );
      h5Annotations.forEach((ann) => annotator.state.store.delete(ann.id));

      try {
        // Load both positive and negative annotations
        const [positiveAnnotations, negativeAnnotations] = await Promise.all([
          loadH5AnnotationsByCategory(imageNumber, "positive"),
          loadH5AnnotationsByCategory(imageNumber, "negative"),
        ]);

        const totalLoaded =
          positiveAnnotations.length + negativeAnnotations.length;

        if (totalLoaded > 0) {
          // Add all annotations at once
          annotator.addAnnotations([
            ...positiveAnnotations,
            ...negativeAnnotations,
          ]);
          toast.success(
            `Loaded ${positiveAnnotations.length} positive and ${negativeAnnotations.length} negative annotations`
          );
        } else {
          toast.info("No annotations found for this image");
        }
      } catch (error) {
        console.error("Failed to load annotations:", error);
        toast.error("Failed to load annotations");
      }
    };

    // Add small delay to ensure browser APIs are fully available
    const timeoutId = setTimeout(loadAnnotations, 100);
    return () => clearTimeout(timeoutId);
  }, [currentImage, annotator]);

  return null; // This component just handles the side effect
}

export function PlaygroundApp() {
  const [viewer, setViewer] = useState<any>(undefined);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [tool, setTool] = useState<ToolType>("pan");
  const [threshold, setThreshold] = useState(8);
  const [pushRadius, setPushRadius] = useState(30);
  const [activeLayerId, setActiveLayerId] = useState<string>("default");
  const [imageVisible, setImageVisible] = useState(true);

  const currentImage = DEMO_IMAGES[currentImageIndex];

  // Category-based styling: red for negative, green for positive
  const categoryStyleFunction = useCallback(
    (annotation: Annotation): AnnotationStyle => {
      const category = annotation.properties?.category as string | undefined;

      if (category === "negative") {
        return {
          fill: "#FF0000", // Red fill for negative
          fillOpacity: 0.3,
          stroke: "#FF6666", // Light red stroke
          strokeOpacity: 1.0,
          strokeWidth: 2,
        };
      }

      // Default: positive (green)
      return {
        fill: "#00FF00", // Green fill for positive
        fillOpacity: 0.25,
        stroke: "#FFFFFF", // White stroke
        strokeOpacity: 1.0,
        strokeWidth: 2,
      };
    },
    []
  );

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % DEMO_IMAGES.length);
  };

  // Apply image opacity when imageVisible changes
  useEffect(() => {
    if (!viewer) return;

    // Target the OpenSeadragon canvas element that contains the image
    const osdCanvas = viewer.element?.querySelector(".openseadragon-canvas");
    if (osdCanvas) {
      // Find the canvas element inside (the image canvas, not annotation canvas)
      const imageCanvas = osdCanvas.querySelector(
        "canvas:not(.annota-pixi-canvas)"
      );
      if (imageCanvas instanceof HTMLElement) {
        imageCanvas.style.opacity = imageVisible ? "1" : "0";
      }
    }
  }, [viewer, imageVisible]);

  return (
    <AnnotaProvider>
      <div className="h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-slate-950">
        <Toaster />
        <div className="relative h-full">
          <AnnotaViewer
            className="h-full"
            options={{
              tileSources: {
                type: "image",
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
            }}
            onViewerReady={setViewer}
          />
          <Annotator viewer={viewer} style={categoryStyleFunction}>
            <ToolManager
              viewer={viewer}
              tool={tool}
              threshold={threshold}
              pushRadius={pushRadius}
              activeLayerId={activeLayerId}
            />
            <PopupEditor viewer={viewer} />
            <AnnotationEditor viewer={viewer} />
            <DemoContent currentImage={currentImage} />
          </Annotator>
          <div className="absolute top-4 left-4 bottom-4 z-10">
            <DemoToolbar
              tool={tool}
              onToolChange={setTool}
              viewer={viewer}
              layerPanel={
                <LayerPanel
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9"
                      title="Layers"
                    >
                      <Layers className="w-4 h-4" />
                    </Button>
                  }
                  activeLayerId={activeLayerId}
                  onActiveLayerChange={setActiveLayerId}
                  imageVisible={imageVisible}
                  onImageVisibleChange={setImageVisible}
                />
              }
            />
          </div>
          <div className="absolute top-4 left-20 z-10">
            <ToolSettings
              tool={tool}
              threshold={threshold}
              onThresholdChange={setThreshold}
              pushRadius={pushRadius}
              onPushRadiusChange={setPushRadius}
            />
          </div>
          <DebugPanel
            currentImage={currentImage}
            onNextImage={handleNextImage}
          />
        </div>
      </div>
    </AnnotaProvider>
  );
}
