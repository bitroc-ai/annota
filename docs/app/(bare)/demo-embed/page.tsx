"use client";

import { useEffect, useState, useRef } from "react";
import { AnnotaProvider, Annotator, useTool, useAnnotator } from "annota";
import { SamTool, loadNpyEmbedding, createDummyEmbedding } from "annota";
import type { Annotation } from "annota";

/**
 * Embedded demo page - designed to be embedded in homepage via iframe
 * This runs as a separate route to avoid SSR issues
 */
export default function DemoEmbedPage() {
  const [viewer, setViewer] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div style={{ width: "100%", height: "100vh", margin: 0, padding: 0 }}>
      <AnnotaProvider>
        <div className="relative w-full h-full bg-white dark:bg-slate-900">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-2"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading SAM model...</p>
              </div>
            </div>
          )}

          {/* Viewer */}
          <div className="relative w-full h-full">
            <Annotator
              viewer={viewer}
              onViewerReady={setViewer}
              tileSources="/playground/images/test/0.png"
              osdOptions={{
                showNavigationControl: false,
                gestureSettingsMouse: {
                  clickToZoom: false,
                  dblClickToZoom: true,
                },
                maxZoomPixelRatio: 2,
                minZoomImageRatio: 1,
                visibilityRatio: 1,
                constrainDuringPan: true,
              }}
            />
            <DemoToolManager
              viewer={viewer}
              onModelReady={() => setIsLoading(false)}
            />
          </div>

          {/* Hint overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/90 text-white text-sm rounded-lg shadow-lg backdrop-blur-sm border border-slate-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Hover to preview • Click to annotate</span>
            </div>
          </div>
        </div>
      </AnnotaProvider>
    </div>
  );
}

function DemoToolManager({
  viewer,
  onModelReady
}: {
  viewer?: any;
  onModelReady: () => void;
}) {
  const annotator = useAnnotator();
  const [samTool, setSamTool] = useState<SamTool | null>(null);
  const modelReadyRef = useRef(false);

  useEffect(() => {
    if (!viewer) return;

    const initTool = async () => {
      try {
        const dummyEmbedding = createDummyEmbedding();

        const tool = new SamTool({
          decoderModelUrl: "/models/sam_onnx_quantized_vit_b.onnx",
          embedding: dummyEmbedding,
          imageWidth: 1024,
          imageHeight: 1024,
          showHoverPreview: true,
          previewOpacity: 0.5,
          annotationProperties: {
            properties: {
              source: "sam-demo",
              layer: "demo",
            },
          },
        });

        await tool.initializeModel();
        setSamTool(tool);

        if (!modelReadyRef.current) {
          modelReadyRef.current = true;
          onModelReady();
        }

        try {
          const embedding = await loadNpyEmbedding("/playground/embeddings/test/0.npy");
          const item: any = viewer.world?.getItemAt?.(0);
          const dims = item?.source?.dimensions;
          const width = dims?.x ?? 1024;
          const height = dims?.y ?? 1024;
          tool.setEmbedding(embedding, width, height);
        } catch (e) {
          console.log("Using dummy embedding for demo");
        }
      } catch (error) {
        console.error("Failed to initialize SAM tool:", error);
      }
    };

    initTool();
  }, [viewer, onModelReady]);

  useTool({
    viewer,
    handler: samTool,
    enabled: !!samTool && !!viewer,
  });

  useEffect(() => {
    if (!annotator || !viewer) return;

    const addExampleAnnotations = () => {
      setTimeout(() => {
        const item: any = viewer.world?.getItemAt?.(0);
        const dims = item?.source?.dimensions;
        const width = dims?.x ?? 1024;
        const height = dims?.y ?? 1024;

        const examples: Annotation[] = [
          {
            id: "demo-1",
            shape: {
              type: "polygon",
              points: [
                { x: width * 0.15, y: height * 0.2 },
                { x: width * 0.25, y: height * 0.2 },
                { x: width * 0.25, y: height * 0.35 },
                { x: width * 0.15, y: height * 0.35 },
              ],
              bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
            },
            properties: {
              source: "demo-example",
              label: "Example",
            },
            style: {
              strokeColor: "#10b981",
              strokeWidth: 2,
              fillColor: "#10b981",
              fillOpacity: 0.2,
            },
          },
          {
            id: "demo-2",
            shape: {
              type: "polygon",
              points: [
                { x: width * 0.7, y: height * 0.6 },
                { x: width * 0.85, y: height * 0.6 },
                { x: width * 0.85, y: height * 0.75 },
                { x: width * 0.7, y: height * 0.75 },
              ],
              bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
            },
            properties: {
              source: "demo-example",
              label: "Example",
            },
            style: {
              strokeColor: "#f59e0b",
              strokeWidth: 2,
              fillColor: "#f59e0b",
              fillOpacity: 0.2,
            },
          },
        ];

        examples.forEach((annotation) => {
          try {
            annotator.state.store.add(annotation);
          } catch (e) {
            // Ignore duplicates
          }
        });
      }, 500);
    };

    addExampleAnnotations();
  }, [annotator, viewer]);

  return null;
}
