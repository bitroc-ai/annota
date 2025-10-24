'use client';

import { useState } from 'react';
import { useLayerManager } from 'annota';
import { Eye, EyeOff, Lock, Unlock, Plus, X, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [newLayerName, setNewLayerName] = useState('');
  const [showAddLayer, setShowAddLayer] = useState(false);

  const handleAddLayer = () => {
    if (!newLayerName.trim()) return;

    const id = `layer-${Date.now()}`;
    layerManager.createLayer(id, {
      name: newLayerName,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: layerManager.layers.length,
    });

    setNewLayerName('');
    setShowAddLayer(false);
  };

  const sortedLayers = [...layerManager.layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[320px] bg-slate-800 border-slate-700 p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Layers</h3>
          <button
            onClick={() => setShowAddLayer(!showAddLayer)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Add layer"
          >
            <Plus className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Add Layer Form */}
        {showAddLayer && (
          <div className="px-4 py-3 border-b border-slate-700 space-y-2">
            <input
              type="text"
              value={newLayerName}
              onChange={e => setNewLayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddLayer()}
              placeholder="Layer name..."
              className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddLayer}
                className="flex-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddLayer(false);
                  setNewLayerName('');
                }}
                className="flex-1 px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Layer List */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Image Layer (Special) */}
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onImageVisibleChange?.(!imageVisible)}
                className="p-1 hover:bg-slate-600 rounded transition-colors"
                title={imageVisible ? 'Hide image' : 'Show image'}
              >
                {imageVisible ? (
                  <Eye className="w-4 h-4 text-blue-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                )}
              </button>
              <span className="flex-1 text-sm text-neutral-300 font-semibold">Image</span>
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
              {sortedLayers.map(layer => {
                const isActive = activeLayerId === layer.id;
                return (
                  <div
                    key={layer.id}
                    className={`px-3 py-2 hover:bg-slate-700/50 transition-colors group relative ${
                      isActive ? 'bg-green-900/30' : ''
                    }`}
                  >
                    {/* Active indicator bar on left */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      {/* Active Layer Indicator - Star icon */}
                      <button
                        onClick={() => onActiveLayerChange?.(layer.id)}
                        className="p-1 hover:bg-slate-600 rounded transition-colors"
                        title={isActive ? 'Active layer' : 'Set as active layer'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isActive
                              ? 'text-green-500 fill-green-500'
                              : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        />
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        onClick={() => layerManager.setLayerVisibility(layer.id, !layer.visible)}
                        className="p-1 hover:bg-slate-600 rounded transition-colors"
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? (
                          <Eye className="w-4 h-4 text-blue-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        onClick={() => layerManager.setLayerLocked(layer.id, !layer.locked)}
                        className="p-1 hover:bg-slate-600 rounded transition-colors"
                        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      >
                        {layer.locked ? (
                          <Lock className="w-4 h-4 text-orange-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {/* Layer Name */}
                      <span
                        className={`flex-1 text-sm truncate ${isActive ? 'text-green-400 font-semibold' : 'text-white'}`}
                      >
                        {layer.name}
                      </span>

                      {/* Delete Button (only show for non-default layers) */}
                      {layer.id !== 'default' && (
                        <button
                          onClick={() => layerManager.deleteLayer(layer.id)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-all"
                          title="Delete layer"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>

                    {/* Opacity Slider */}
                    <div className="flex items-center gap-2 ml-10">
                      <span className="text-xs text-slate-500 w-16">Opacity:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity}
                        onChange={e =>
                          layerManager.setLayerOpacity(layer.id, parseFloat(e.target.value))
                        }
                        className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="text-xs text-neutral-400 w-8 text-right">
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
