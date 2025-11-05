"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  AnnotaProvider,
  AnnotaViewer,
  Annotator,
  useAnnotator,
  useEditing,
  useAnnotationDoubleClick,
  getEditorConfig,
  loadH5Coordinates,
  loadMaskPolygons,
  AnnotationEditor,
  initKeyboardCommands,
  type Annotation,
  type AnnotationStyle,
} from "annota";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AnnotationToolbar, GeneralToolbar } from "@/components/playground/toolbar";
import { ToolSettings } from "@/components/playground/tool-settings";
import { DebugPanel } from "@/components/playground/debug-panel";
import { ToolManager } from "@/components/playground/tool-manager";
import { LayerPanel } from "@/components/playground/layer-panel";
import { AnnotationContextMenu } from "@/components/playground/context-menu";
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

    // Add category to each annotation (points), and make IDs unique
    // The layer filter will automatically assign them to positive-points or negative-points
    return annotations.map((ann) => ({
      ...ann,
      id: `${category}-${ann.id}`, // Prefix ID with category to avoid conflicts
      properties: {
        ...ann.properties,
        category, // This will be used by layer filter
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
  const { startEditing, stopEditing } = useEditing();

  // Initialize keyboard commands
  useEffect(() => {
    if (!annotator) return;

    const commands = initKeyboardCommands(annotator, {
      enableDelete: true,
      enableUndoRedo: true,
    });

    return () => commands.destroy();
  }, [annotator]);

  // Double-click to enter edit mode
  useAnnotationDoubleClick(
    annotator?.viewer,
    useCallback(
      (annotation: Annotation) => {
        const editorConfig = getEditorConfig(annotation);
        if (editorConfig?.supportsVertexEditing) {
          startEditing(annotation.id);
          toast.success("Vertex editing mode enabled");
        }
      },
      [startEditing]
    )
  );

  // Escape key to exit edit mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopEditing();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [stopEditing]);

  // Create layers on mount
  // Layer structure (from bottom to top):
  // - Image (zIndex: -1, built-in)
  // - Positive Points (zIndex: 1)
  // - Negative Points (zIndex: 2)
  // - Positive Masks (zIndex: 3)
  // - Negative Masks (zIndex: 4)
  // - Default (zIndex: 0, built-in)
  useEffect(() => {
    if (!annotator) return;

    // Create layer for positive point annotations
    if (!annotator.getLayer("positive-points")) {
      annotator.createLayer("positive-points", {
        name: "Positive Points",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        filter: (ann) => {
          // Point annotations with category="positive"
          return (
            ann.shape.type === "point" &&
            ann.properties?.category === "positive"
          );
        },
      });
    }

    // Create layer for negative point annotations
    if (!annotator.getLayer("negative-points")) {
      annotator.createLayer("negative-points", {
        name: "Negative Points",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 2,
        filter: (ann) => {
          // Point annotations with category="negative"
          return (
            ann.shape.type === "point" &&
            ann.properties?.category === "negative"
          );
        },
      });
    }

    // Create layer for positive mask annotations
    if (!annotator.getLayer("positive-masks")) {
      annotator.createLayer("positive-masks", {
        name: "Positive Masks",
        visible: true,
        locked: false,
        opacity: 0.6,
        zIndex: 3,
        filter: (ann) => {
          // Polygon/mask/path annotations with classification="positive" or default
          const isMaskShape =
            ann.shape.type === "polygon" ||
            ann.shape.type === "multipolygon" ||
            ann.shape.type === "path";
          if (!isMaskShape) return false;

          // Explicit positive or no classification set (default to positive)
          return ann.properties?.classification === "positive" || !ann.properties?.classification;
        },
      });
    }

    // Create layer for negative mask annotations
    if (!annotator.getLayer("negative-masks")) {
      annotator.createLayer("negative-masks", {
        name: "Negative Masks",
        visible: true,
        locked: false,
        opacity: 0.6,
        zIndex: 4,
        filter: (ann) => {
          // Polygon/mask/path annotations with classification="negative"
          const isMaskShape =
            ann.shape.type === "polygon" ||
            ann.shape.type === "multipolygon" ||
            ann.shape.type === "path";
          return isMaskShape && ann.properties?.classification === "negative";
        },
      });
    }
  }, [annotator]);

  // Load annotations when image changes
  useEffect(() => {
    if (!annotator || typeof window === "undefined") return;

    const loadAnnotations = async () => {
      const imageNumber = currentImage.replace(".png", "");

      // Clear existing H5 and mask annotations
      const allAnnotations = annotator.state.store.all();
      const loadedAnnotations = allAnnotations.filter(
        (ann) =>
          ann.properties?.source === "h5" ||
          ann.properties?.source === "png-mask" ||
          ann.properties?.source === "pgm"
      );
      loadedAnnotations.forEach((ann) => annotator.state.store.delete(ann.id));

      try {
        // Load H5 annotations (points) and mask polygons in parallel
        const [positiveAnnotations, negativeAnnotations, maskAnnotations] =
          await Promise.all([
            loadH5AnnotationsByCategory(imageNumber, "positive"),
            loadH5AnnotationsByCategory(imageNumber, "negative"),
            loadMaskPolygons(`/playground/masks/test/${imageNumber}.png`).catch(
              (err) => {
                console.warn("[Playground] Failed to load mask:", err);
                return [] as Annotation[];
              }
            ), // Fallback to empty if no mask file
          ]);

        // Assign classification to loaded masks (default to positive)
        // Remove style property so categoryStyleFunction applies the correct styling
        const masksWithPolarity = maskAnnotations.map((ann) => {
          const { style, ...annotationWithoutStyle } = ann;
          return {
            ...annotationWithoutStyle,
            properties: {
              ...ann.properties,
              classification: "positive",
              source: "png-mask",
            },
          };
        });

        const totalH5 = positiveAnnotations.length + negativeAnnotations.length;
        const totalMasks = masksWithPolarity.length;

        if (totalH5 > 0 || totalMasks > 0) {
          // Add all annotations at once
          const allAnnotations = [
            ...positiveAnnotations,
            ...negativeAnnotations,
            ...masksWithPolarity,
          ];

          annotator.addAnnotations(allAnnotations);

          const messages = [];
          if (totalH5 > 0) {
            messages.push(
              `${positiveAnnotations.length} positive, ${negativeAnnotations.length} negative`
            );
          }
          if (totalMasks > 0) {
            messages.push(`${totalMasks} mask(s)`);
          }
          toast.success(`Loaded ${messages.join(", ")}`);
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

  // Memoize viewer options to prevent unnecessary viewer.open() calls
  const viewerOptions = useMemo(
    () => ({
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
    }),
    [currentImage]
  );

  // Category-based styling: red for negative, green for positive
  // Also supports label for polygon/mask annotations
  const categoryStyleFunction = useCallback(
    (annotation: Annotation): AnnotationStyle => {
      const category = annotation.properties?.category as string | undefined;
      const classification = annotation.properties?.classification;

      // Check mask polarity first (for polygon masks)
      if (classification === "negative") {
        return {
          fill: "#FF0000", // Red fill for negative masks
          fillOpacity: 0.4,
          stroke: "#FF6666", // Light red stroke
          strokeOpacity: 1.0,
          strokeWidth: 2,
        };
      }

      if (classification === "positive") {
        return {
          fill: "#00FF00", // Green fill for positive masks
          fillOpacity: 0.3,
          stroke: "#66FF66", // Light green stroke
          strokeOpacity: 1.0,
          strokeWidth: 2,
        };
      }

      // Fall back to category property (for point annotations)
      if (category === "negative") {
        return {
          fill: "#FF0000", // Red fill for negative points
          fillOpacity: 0.3,
          stroke: "#FF6666", // Light red stroke
          strokeOpacity: 1.0,
          strokeWidth: 2,
        };
      }

      if (category === "positive") {
        return {
          fill: "#00FF00", // Green fill for positive points
          fillOpacity: 0.25,
          stroke: "#FFFFFF", // White stroke
          strokeOpacity: 1.0,
          strokeWidth: 2,
        };
      }

      // For other annotations (masks, contours, etc.), return their own style
      // The annotation.style will be merged on top of this
      return annotation.style || {};
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
        <Toaster position="top-right" />
        <div className="relative h-full">
          <AnnotaViewer
            className="h-full"
            options={viewerOptions}
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
            <AnnotationEditor viewer={viewer} />
            <AnnotationContextMenu />
            <DemoContent currentImage={currentImage} />
          </Annotator>
          {/* Annotation Toolbar - Left side */}
          <div className="absolute top-4 left-4 bottom-4">
            <AnnotationToolbar
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

          {/* Tool Settings - Next to annotation toolbar */}
          <div className="absolute top-4 left-20">
            <ToolSettings
              tool={tool}
              threshold={threshold}
              onThresholdChange={setThreshold}
              pushRadius={pushRadius}
              onPushRadiusChange={setPushRadius}
            />
          </div>

          {/* General Toolbar - Bottom right */}
          <div className="absolute bottom-4 right-4">
            <GeneralToolbar viewer={viewer} />
          </div>

          {/* Debug Panel - Top right */}
          <DebugPanel
            currentImage={currentImage}
            onNextImage={handleNextImage}
          />
        </div>
      </div>
    </AnnotaProvider>
  );
}
