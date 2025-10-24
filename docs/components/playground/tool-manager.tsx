import { useEffect, useMemo } from 'react';
import {
  useTool,
  usePushToolCursor,
  PointTool,
  RectangleTool,
  PolygonTool,
  PushTool,
  ContourTool,
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
  const contourTool = useMemo(
    () =>
      new ContourTool({
        threshold,
        annotationProperties: {
          layer: activeLayerId,
          category: 'positive',
          tags: [],
        },
      }),
    [activeLayerId]
  );
  // Update dynamic properties
  useEffect(() => {
    pushTool.setPushRadius(pushRadius);
  }, [pushTool, pushRadius]);

  useEffect(() => {
    contourTool?.setThreshold(threshold);
  }, [contourTool, threshold]);

  // Enable tools based on selection (disabled when viewer is null)
  useTool({ viewer, handler: pointTool, enabled: tool === 'point' && !!viewer });
  useTool({ viewer, handler: rectangleTool, enabled: tool === 'rectangle' && !!viewer });
  useTool({ viewer, handler: polygonTool, enabled: tool === 'polygon' && !!viewer });
  useTool({ viewer, handler: pushTool, enabled: tool === 'push' && !!viewer });
  useTool({
    viewer,
    handler: contourTool,
    enabled: tool === 'cell-detect' && !!contourTool && !!viewer,
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
