import { useEffect, useMemo } from 'react';
import {
  useInteraction,
  usePushToolCursor,
  PointTool,
  RectangleTool,
  PolygonTool,
  PushTool,
  CellDetectTool,
} from 'annota';
import type { ToolType } from './toolbar';

interface ToolManagerProps {
  viewer: any;
  tool: ToolType;
  threshold: number;
  pushRadius: number;
  activeLayerId?: string;
}

export function ToolManager({
  viewer,
  tool,
  threshold,
  pushRadius,
  activeLayerId,
}: ToolManagerProps) {
  // Create tool instances with active layer
  const pointTool = useMemo(
    () =>
      new PointTool({
        annotationProperties: {
          layer: activeLayerId,
          category: 'positive',
          tags: [],
        },
      }),
    [activeLayerId]
  );
  const rectangleTool = useMemo(
    () =>
      new RectangleTool({
        annotationProperties: {
          layer: activeLayerId,
          category: 'positive',
          tags: [],
        },
      }),
    [activeLayerId]
  );
  const polygonTool = useMemo(
    () =>
      new PolygonTool({
        annotationProperties: {
          layer: activeLayerId,
          category: 'positive',
          tags: [],
        },
      }),
    [activeLayerId]
  );
  const pushTool = useMemo(() => new PushTool({ pushRadius }), [pushRadius]);
  const cellDetectTool = useMemo(() => {
    if (!viewer) return null;
    const tiledImage = viewer.world.getItemAt(0);
    if (!tiledImage) return null;
    return new CellDetectTool({
      cv: (window as any).cv,
      tileSource: tiledImage.source,
      threshold,
      annotationProperties: {
        layer: activeLayerId,
        category: 'positive',
        tags: [],
      },
    });
  }, [viewer, threshold, activeLayerId]);
  // Update dynamic properties
  useEffect(() => {
    pushTool.setPushRadius(pushRadius);
  }, [pushTool, pushRadius]);

  useEffect(() => {
    cellDetectTool?.setThreshold(threshold);
  }, [cellDetectTool, threshold]);

  // Enable tools based on selection (disabled when viewer is null)
  useInteraction({ viewer, handler: pointTool, enabled: tool === 'point' && !!viewer });
  useInteraction({ viewer, handler: rectangleTool, enabled: tool === 'rectangle' && !!viewer });
  useInteraction({ viewer, handler: polygonTool, enabled: tool === 'polygon' && !!viewer });
  useInteraction({ viewer, handler: pushTool, enabled: tool === 'push' && !!viewer });
  useInteraction({
    viewer,
    handler: cellDetectTool,
    enabled: tool === 'cell-detect' && !!cellDetectTool && !!viewer,
  });

  // Render push cursor (disabled when viewer is null)
  const { cursorPos, radiusInPixels } = usePushToolCursor(viewer, pushTool, tool === 'push' && !!viewer);

  return (
    <>
      {cursorPos && (
        <div
          style={{
            position: 'fixed',
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${radiusInPixels * 2}px`,
            height: `${radiusInPixels * 2}px`,
            borderRadius: '50%',
            border: '2px solid #00ff00',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}
    </>
  );
}
