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

    // Create viewer once on mount
    useEffect(() => {
      if (!elementRef.current || viewerRef.current) return;

      // Sensible performance defaults; user-provided options override these
      const perfDefaults: Partial<OpenSeadragon.Options> & { drawer?: string } = {
        // Drawer options: 'canvas' (default, best compatibility), 'webgl' (better performance), 'html' (legacy)
        // webgl provides better performance but requires WebGL support
        drawer: 'canvas',
        immediateRender: true,
        alwaysBlend: false,
        blendTime: 0.05,
        animationTime: 0.2,
        imageLoaderLimit: 16,
        maxImageCacheCount: 512,
        preload: true,
        timeout: 120000,
        preserveImageSizeOnResize: true,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: false,
        } as any,
      };

      const viewer = OpenSeadragon({
        ...perfDefaults,
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

    // Update tile source when options.tileSources changes
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || !options.tileSources) return;

      // Use viewer.open() to update tile source without recreating viewer
      // This is much faster than destroying and recreating the entire viewer
      viewer.open(options.tileSources);
    }, [options.tileSources]);

    return (
      <div
        ref={elementRef}
        className={className}
        style={{ ...style, isolation: 'isolate' }}
      />
    );
  }
);

Viewer.displayName = 'Viewer';
