"use client";

import { useLayerManager, useAnnotator, exportMasksToPng } from "annota";
import { Eye, EyeOff, Lock, Unlock, Star, Download } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayerPanelProps {
  trigger: React.ReactNode;
  activeLayerId?: string;
  onActiveLayerChange?: (layerId: string) => void;
  imageVisible?: boolean;
  onImageVisibleChange?: (visible: boolean) => void;
}

export function LayerPanel({
  trigger,
  activeLayerId,
  onActiveLayerChange,
  imageVisible = true,
  onImageVisibleChange,
}: LayerPanelProps) {
  const layerManager = useLayerManager();
  const annotator = useAnnotator();

  const handleExportLayer = async (layerId: string, layerName: string) => {
    if (!annotator) return;

    try {
      // Get the layer
      const layer = annotator.getLayer(layerId);
      if (!layer) {
        toast.error("Layer not found");
        return;
      }

      // Get all annotations in this layer
      const allAnnotations = annotator.state.store.all();
      const layerAnnotations = allAnnotations.filter((ann) => {
        if (!layer.filter) return false;
        return layer.filter(ann);
      });

      if (layerAnnotations.length === 0) {
        toast.info("No annotations in this layer to export");
        return;
      }

      // Get image dimensions from the viewer
      if (!annotator.viewer) {
        toast.error("Viewer not available");
        return;
      }

      const tiledImage = annotator.viewer.world.getItemAt(0);
      if (!tiledImage) {
        toast.error("No image loaded");
        return;
      }

      const width = tiledImage.source.dimensions.x;
      const height = tiledImage.source.dimensions.y;

      // Export to PNG
      toast.info("Exporting mask layer...");
      const pngData = await exportMasksToPng(layerAnnotations, width, height);

      // Download the file
      const blob = new Blob([pngData], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${layerName.replace(/\s+/g, "_")}_mask.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${layerAnnotations.length} mask(s) to PNG`);
    } catch (error) {
      console.error("Failed to export layer:", error);
      toast.error("Failed to export layer");
    }
  };

  // Filter out image layer only (it's shown separately below)
  const sortedLayers = [...layerManager.layers]
    .filter((layer) => layer.id !== "image")
    .sort((a, b) => b.zIndex - a.zIndex);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={12}
        className="w-[320px] p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold">Layers</h3>
        </div>

        {/* Layer List */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Image Layer (Special) */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onImageVisibleChange?.(!imageVisible)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                title={imageVisible ? "Hide image" : "Show image"}
              >
                {imageVisible ? (
                  <Eye className="w-4 h-4 text-blue-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
              </button>
              <span className="flex-1 text-sm font-semibold">Image</span>
              <span className="text-xs text-slate-500">Background</span>
            </div>
          </div>

          {/* Annotation Layers */}
          {sortedLayers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No annotation layers
            </div>
          ) : (
            <div className="py-1">
              {sortedLayers.map((layer) => {
                const isActive = activeLayerId === layer.id;
                return (
                  <div
                    key={layer.id}
                    className={`px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative ${
                      isActive ? "bg-slate-100 dark:bg-slate-800" : ""
                    }`}
                  >
                    {/* Active indicator bar on left */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      {/* Active Layer Indicator - Star icon */}
                      <button
                        onClick={() => onActiveLayerChange?.(layer.id)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title={
                          isActive ? "Active layer" : "Set as active layer"
                        }
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isActive
                              ? "text-blue-500 fill-blue-500"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          }`}
                        />
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        onClick={() =>
                          layerManager.setLayerVisibility(
                            layer.id,
                            !layer.visible
                          )
                        }
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title={layer.visible ? "Hide layer" : "Show layer"}
                      >
                        {layer.visible ? (
                          <Eye className="w-4 h-4 text-blue-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        onClick={() =>
                          layerManager.setLayerLocked(layer.id, !layer.locked)
                        }
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title={layer.locked ? "Unlock layer" : "Lock layer"}
                      >
                        {layer.locked ? (
                          <Lock className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Unlock className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      {/* Layer Name */}
                      <span
                        className={`flex-1 text-sm truncate ${
                          isActive
                            ? "text-blue-600 dark:text-blue-400 font-semibold"
                            : ""
                        }`}
                      >
                        {layer.name}
                      </span>

                      {/* Export Button (only show for mask layers) */}
                      {(layer.id === "positive-masks" ||
                        layer.id === "negative-masks") && (
                        <button
                          onClick={() =>
                            handleExportLayer(layer.id, layer.name)
                          }
                          className="p-1 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition-colors"
                          title="Export layer as PNG mask"
                        >
                          <Download className="w-4 h-4 text-green-600 dark:text-green-500" />
                        </button>
                      )}
                    </div>

                    {/* Opacity Slider */}
                    <div className="flex items-center gap-2 ml-10">
                      <span className="text-xs text-slate-500 w-16">
                        Opacity:
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity}
                        onChange={(e) =>
                          layerManager.setLayerOpacity(
                            layer.id,
                            parseFloat(e.target.value)
                          )
                        }
                        className="flex-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="text-xs text-slate-500 w-8 text-right">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
