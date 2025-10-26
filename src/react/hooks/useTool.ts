/**
 * Hook for managing an interaction handler's lifecycle
 *
 * Automatically initializes and destroys the handler based on viewer/annotator availability
 * and enabled state.
 *
 * @example
 * ```tsx
 * const moveInteraction = useMemo(() => new MoveInteraction(), []);
 * useTool({
 *   viewer,
 *   handler: moveInteraction,
 *   enabled: tool === 'pan' || tool === 'move'
 * });
 * ```
 */

import { useEffect, useRef } from 'react';
import type OpenSeadragon from 'openseadragon';
import { useAnnotator } from '../Provider';
import type { ToolHandler } from '../../tools/types';

/**
 * Options for useTool hook
 */
export interface UseToolOptions {
  /** OpenSeadragon viewer instance */
  viewer: OpenSeadragon.Viewer | undefined;

  /** The tool handler to use (can be null if not yet initialized) */
  handler: ToolHandler | null;

  /** Whether the tool is enabled */
  enabled: boolean;
}

export function useTool({ viewer, handler, enabled }: UseToolOptions): void {
  const annotator = useAnnotator();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!handler || !viewer || !annotator) {
      if (initializedRef.current && handler) {
        handler.destroy();
        initializedRef.current = false;
      }
      return;
    }

    if (enabled && !initializedRef.current) {
      handler.init(viewer, annotator);
      initializedRef.current = true;
    } else if (!enabled && initializedRef.current) {
      handler.destroy();
      initializedRef.current = false;
    }

    // Update enabled state
    handler.enabled = enabled;

    return () => {
      if (initializedRef.current && handler) {
        handler.destroy();
        initializedRef.current = false;
      }
    };
  }, [viewer, annotator, handler, enabled]);
}
