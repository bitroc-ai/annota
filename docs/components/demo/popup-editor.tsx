import { X } from 'lucide-react';
import { AnnotationPopup, usePopup, useLayerManager, useAnnotationDoubleClick } from 'annota';

interface PopupEditorProps {
  viewer: any;
}

export function PopupEditor({ viewer }: PopupEditorProps) {
  const popup = usePopup({ autoShow: false });
  const layerManager = useLayerManager();

  // Show popup on double-click
  useAnnotationDoubleClick(viewer, annotation => {
    popup.show(annotation.id);
  });

  if (!popup.annotation) return null;

  const currentLayer = popup.annotation.properties?.layer as string | undefined;
  const currentCategory = popup.annotation.properties?.category as string | undefined;

  return (
    <AnnotationPopup
      viewer={viewer}
      annotation={popup.annotation}
      options={{ anchor: 'bottom-center', offset: { x: 0, y: 20 } }}
      onClose={popup.hide}
    >
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl min-w-[250px]">
        <div className="flex justify-between items-start mb-3">
          <div className="text-sm font-medium text-white">Edit Annotation</div>
          <button
            onClick={popup.hide}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {/* Layer Selection */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Layer</label>
            <select
              value={currentLayer || ''}
              onChange={e =>
                popup.updateProperties(popup.annotation!.id, { layer: e.target.value })
              }
              className="w-full px-2 py-1 text-sm bg-neutral-800 text-white border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No Layer</option>
              {layerManager.layers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Category</label>
            <select
              value={currentCategory || 'positive'}
              onChange={e =>
                popup.updateProperties(popup.annotation!.id, { category: e.target.value })
              }
              className="w-full px-2 py-1 text-sm bg-neutral-800 text-white border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          {/* Group Name */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Group</label>
            <input
              type="text"
              placeholder="Group name..."
              value={(popup.annotation.properties?.group as string) || ''}
              onChange={e =>
                popup.updateProperties(popup.annotation!.id, { group: e.target.value })
              }
              className="w-full px-2 py-1 text-sm bg-neutral-800 text-white border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Delete Button */}
          <button
            onClick={() => popup.deleteAnnotation(popup.annotation!.id)}
            className="w-full px-2 py-1 text-sm bg-red-900 hover:bg-red-800 text-white rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </AnnotationPopup>
  );
}
