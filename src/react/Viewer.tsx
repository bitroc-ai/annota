/**
 * Annota React - Viewer Component
 * OpenSeadragon viewer wrapper
 */

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import OpenSeadragon from 'openseadragon';

/**
 * Viewer props
 */
export interface ViewerProps {
  className?: string;
  style?: React.CSSProperties;
  options: OpenSeadragon.Options;
  onViewerReady?: (viewer: OpenSeadragon.Viewer) => void;
}

/**
 * Viewer
 * Creates and manages OpenSeadragon viewer lifecycle
 */
export const Viewer = forwardRef<OpenSeadragon.Viewer | undefined, ViewerProps>(
  ({ className, style, options, onViewerReady }, ref) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<OpenSeadragon.Viewer | undefined>(undefined);

    useImperativeHandle(ref, () => viewerRef.current, []);

    useEffect(() => {
      if (!elementRef.current || viewerRef.current) return;

      const viewer = OpenSeadragon({
        ...options,
        element: elementRef.current,
      });

      viewerRef.current = viewer;
      onViewerReady?.(viewer);

      return () => {
        viewer.destroy();
        viewerRef.current = undefined;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only create viewer once on mount

    return <div ref={elementRef} className={className} style={style} />;
  }
);

Viewer.displayName = 'Viewer';
