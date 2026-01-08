<script lang="ts">
  import { onMount } from "svelte";
  import { getAnnotator, editing, type Annotation } from "annota/svelte";
  import {
    getEditorConfig,
    initKeyboardCommands,
    loadH5Coordinates,
    loadMaskPolygons,
  } from "annota";
  import { toastSuccess, toastError, toastInfo } from "$lib/services/toast";

  interface Props {
    currentImage: string;
  }

  let { currentImage }: Props = $props();

  const getAnnotatorFn = getAnnotator();
  const annotator = $derived(getAnnotatorFn());
  const { startEditing, stopEditing } = editing();

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

      return annotations.map((ann) => ({
        ...ann,
        id: `${category}-${ann.id}`,
        properties: {
          ...ann.properties,
          category,
          source: "h5",
        },
      }));
    } catch (error) {
      console.warn(`No H5 file found or error loading: ${h5Path}`, error);
      return [];
    }
  }

  // Initialize keyboard commands
  onMount(() => {
    if (!annotator) return;

    const commands = initKeyboardCommands(annotator, {
      enableDelete: true,
      enableUndoRedo: true,
    });

    return () => commands.destroy();
  });

  // Double-click to enter edit mode
  $effect(() => {
    if (!annotator?.viewer) return;
    
    const handleDoubleClick = (event: any) => {
      const annotation = event.annotation;
      if (!annotation) return;
      
      const editorConfig = getEditorConfig(annotation);
      if (editorConfig?.supportsVertexEditing) {
        startEditing(annotation.id);
        toastSuccess("Vertex editing mode enabled");
      }
    };
    
    annotator.viewer.addHandler('canvas-double-click', handleDoubleClick);
    return () => {
      annotator.viewer?.removeHandler('canvas-double-click', handleDoubleClick);
    };
  });

  // Escape key to exit edit mode
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopEditing();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Create layers when annotator becomes available
  // Must use $effect instead of onMount because annotator is set asynchronously
  $effect(() => {
    if (!annotator) return;

    // Create layer for positive point annotations
    if (!annotator.getLayer("positive-points")) {
      annotator.createLayer("positive-points", {
        name: "Positive Points",
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        filter: (ann: Annotation) => {
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
        filter: (ann: Annotation) => {
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
        filter: (ann: Annotation) => {
          const isMaskShape =
            ann.shape.type === "polygon" ||
            ann.shape.type === "multipolygon" ||
            ann.shape.type === "path";
          if (!isMaskShape) return false;
          return (
            ann.properties?.classification === "positive" ||
            !ann.properties?.classification
          );
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
        filter: (ann: Annotation) => {
          const isMaskShape =
            ann.shape.type === "polygon" ||
            ann.shape.type === "multipolygon" ||
            ann.shape.type === "path";
          return isMaskShape && ann.properties?.classification === "negative";
        },
      });
    }

    // Create layer for SAM hover preview
    if (!annotator.getLayer("sam-preview")) {
      annotator.createLayer("sam-preview", {
        name: "SAM Preview",
        visible: true,
        locked: true,
        opacity: 0.4,
        zIndex: 5,
      });
    }
  });

  // Load annotations when image changes
  $effect(() => {
    if (!annotator || typeof window === "undefined" || !currentImage) return;

    const loadAnnotations = async () => {
      const imageNumber = currentImage.replace(".png", "");

      // Clear existing H5 and mask annotations
      const allAnnotations = annotator.state.store.all();
      const loadedAnnotations = allAnnotations.filter(
        (ann: Annotation) =>
          ann.properties?.source === "h5" ||
          ann.properties?.source === "png-mask" ||
          ann.properties?.source === "pgm"
      );
      loadedAnnotations.forEach((ann) => annotator.state.store.delete(ann.id));

      try {
        const [positiveAnnotations, negativeAnnotations, maskAnnotations] =
          await Promise.all([
            loadH5AnnotationsByCategory(imageNumber, "positive"),
            loadH5AnnotationsByCategory(imageNumber, "negative"),
            loadMaskPolygons(`/playground/masks/test/${imageNumber}.png`).catch(
              (err) => {
                console.warn("[Playground] Failed to load mask:", err);
                return [] as Annotation[];
              }
            ),
          ]);

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
          toastSuccess(`Loaded ${messages.join(", ")}`);
        } else {
          toastInfo("No annotations found for this image");
        }
      } catch (error) {
        console.error("Failed to load annotations:", error);
        toastError("Failed to load annotations");
      }
    };

    const timeoutId = setTimeout(loadAnnotations, 100);
    return () => clearTimeout(timeoutId);
  });
</script>

<!-- This component just handles side effects, no UI -->
