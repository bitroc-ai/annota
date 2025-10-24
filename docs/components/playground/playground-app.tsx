'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  AnnotaProvider,
  AnnotaViewer,
  Annotator,
  useAnnotator,
  loadH5Masks,
  AnnotationEditor,
  type Annotation,
  type AnnotationStyle,
} from 'annota';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { DemoToolbar } from '@/components/playground/toolbar';
import { ToolSettings } from '@/components/playground/tool-settings';
import { DebugPanel } from '@/components/playground/debug-panel';
import { ToolManager } from '@/components/playground/tool-manager';
import { PopupEditor } from '@/components/playground/popup-editor';
import { LayerPanel } from '@/components/playground/layer-panel';
import { Layers } from 'lucide-react';
import type { ToolType } from '@/components/playground/toolbar';

const DEMO_IMAGES = ['0.png', '1.png', '2.png', '3.png', '4.png'];

/**
 * Load H5 annotations using the framework's loader
 */
async function loadH5Annotations(imageId: string): Promise<Annotation[]> {
  const h5Path = `/playground/annotations/test/positive/${imageId}.h5`;

  try {
    return await loadH5Masks(h5Path, {
      color: '#FF6B6B',
      fillOpacity: 0.8,
      strokeWidth: 2,
    });
  } catch {
    console.warn(`No H5 file found: ${h5Path}`);
    return [];
  }
}

function DemoContent({
  currentImage,
  showH5Annotations,
}: {
  currentImage: string;
  showH5Annotations: boolean;
}) {
  const annotator = useAnnotator();

  // Create H5 layer on mount
  useEffect(() => {
    if (!annotator) return;

    // Create a layer for H5 annotations if it doesn't exist
    const h5Layer = annotator.getLayer('h5-annotations');
    if (!h5Layer) {
      annotator.createLayer('h5-annotations', {
        name: 'H5 Annotations',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 10,
      });
    }

    // Create a layer for manual annotations if it doesn't exist
    const manualLayer = annotator.getLayer('manual-annotations');
    if (!manualLayer) {
      annotator.createLayer('manual-annotations', {
        name: 'Manual Annotations',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 20,
      });
    }
  }, [annotator]);

  // Load annotations from remote API when H5 toggle is enabled
  useEffect(() => {
    if (!showH5Annotations || !annotator || typeof window === 'undefined') return;

    // Add small delay to ensure browser APIs are fully available
    const timeoutId = setTimeout(async () => {
      try {
        const imageNumber = currentImage.replace('.png', '');

        // Load H5 annotations
        const annotations = await loadH5Annotations(imageNumber);

        if (annotations.length > 0) {
          // Add layer property to all H5 annotations
          const h5Annotations = annotations.map(ann => ({
            ...ann,
            properties: {
              ...ann.properties,
              layer: 'h5-annotations',
              source: 'h5',
              category: 'positive',
              tags: [],
            },
          }));

          // Add all annotations at once using the convenience method
          annotator.addAnnotations(h5Annotations);
          toast.success(`Loaded ${annotations.length} H5 annotations`);
        } else {
          toast.info('No annotations found for this image');
        }
      } catch (error) {
        console.error('Failed to load annotations:', error);
        toast.error('Failed to load annotations');
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [showH5Annotations, currentImage, annotator]);

  return null; // This component just handles the side effect
}

export function PlaygroundApp() {
  const [viewer, setViewer] = useState<any>(undefined);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [tool, setTool] = useState<ToolType>('pan');
  const [threshold, setThreshold] = useState(8);
  const [pushRadius, setPushRadius] = useState(30);
  const [showH5Annotations, setShowH5Annotations] = useState(true);
  const [activeLayerId, setActiveLayerId] = useState<string>('manual-annotations');
  const [imageVisible, setImageVisible] = useState(true);

  const currentImage = DEMO_IMAGES[currentImageIndex];

  // Category-based styling: red for negative, green for positive
  const categoryStyleFunction = useCallback((annotation: Annotation): AnnotationStyle => {
    const category = annotation.properties?.category as string | undefined;

    if (category === 'negative') {
      return {
        fill: '#FF0000', // Red fill for negative
        fillOpacity: 0.3,
        stroke: '#FF6666', // Light red stroke
        strokeOpacity: 1.0,
        strokeWidth: 2,
      };
    }

    // Default: positive (green)
    return {
      fill: '#00FF00', // Green fill for positive
      fillOpacity: 0.25,
      stroke: '#FFFFFF', // White stroke
      strokeOpacity: 1.0,
      strokeWidth: 2,
    };
  }, []);

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % DEMO_IMAGES.length);
  };

  const handleToggleH5 = () => {
    setShowH5Annotations(prev => !prev);
  };

  // Apply image opacity when imageVisible changes
  useEffect(() => {
    if (!viewer) return;

    // Target the OpenSeadragon canvas element that contains the image
    const osdCanvas = viewer.element?.querySelector('.openseadragon-canvas');
    if (osdCanvas) {
      // Find the canvas element inside (the image canvas, not annotation canvas)
      const imageCanvas = osdCanvas.querySelector('canvas:not(.annota-pixi-canvas)');
      if (imageCanvas instanceof HTMLElement) {
        imageCanvas.style.opacity = imageVisible ? '1' : '0';
      }
    }
  }, [viewer, imageVisible]);

  return (
    <AnnotaProvider>
      <div className="h-[calc(100vh-4rem)] w-full bg-neutral-900">
        <Toaster />
        <div className="relative h-full">
          <AnnotaViewer
            className="h-full"
            options={{
              tileSources: { type: 'image', url: `/playground/images/test/${currentImage}` },
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
            <DemoContent currentImage={currentImage} showH5Annotations={showH5Annotations} />
          </Annotator>
          <div className="absolute top-4 left-4 z-10 space-y-2">
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
                      className="w-9 h-9 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
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
            showH5Annotations={showH5Annotations}
            onToggleH5={handleToggleH5}
          />
        </div>
      </div>
    </AnnotaProvider>
  );
}
