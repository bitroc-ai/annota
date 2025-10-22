/**
 * Annotation Popup for OpenSeadragon
 *
 * Based on Annotorious popup pattern.
 * Handles popup positioning that correctly updates on zoom and pan.
 */

import { useEffect, useState, useRef, type ReactNode } from 'react';
import type OpenSeadragon from 'openseadragon';
import type { Annotation, Bounds } from '../core/types';
import type { PopupPosition, PopupAnchor, PopupOptions } from './types';

export interface AnnotationPopupProps {
  /** OpenSeadragon viewer instance */
  viewer: OpenSeadragon.Viewer | undefined;

  /** The annotation to show popup for */
  annotation: Annotation | null;

  /** Custom popup content */
  children: ReactNode;

  /** Popup configuration */
  options?: PopupOptions;

  /** Callback when popup should close */
  onClose?: () => void;
}

/**
 * Calculate popup position from annotation bounds with adaptive positioning
 */
function calculatePopupPosition(
  viewer: OpenSeadragon.Viewer,
  bounds: Bounds,
  anchor: PopupAnchor = 'top-center',
  offset = { x: 0, y: -10 },
  popupElement?: HTMLDivElement | null
): PopupPosition {
  const { minX, minY, maxX, maxY } = bounds;

  // Determine effective anchor based on screen position
  let effectiveAnchor = anchor;

  // If we have the popup element, check if we need to flip the anchor
  if (popupElement) {
    const popupHeight = popupElement.offsetHeight || 200; // Estimate if not rendered yet
    const popupWidth = popupElement.offsetWidth || 250;

    // Get annotation center in window coordinates for checking
    const centerImageX = (minX + maxX) / 2;
    const centerImageY = (minY + maxY) / 2;
    const centerViewport = viewer.viewport.imageToViewportCoordinates(centerImageX, centerImageY);
    const centerWindow = viewer.viewport.viewportToWindowCoordinates(centerViewport);

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Adaptive vertical positioning
    if (anchor === 'bottom-center' || anchor === 'bottom-left' || anchor === 'bottom-right') {
      // Check if popup would go below viewport
      if (centerWindow.y + Math.abs(offset.y) + popupHeight > viewportHeight - 20) {
        // Flip to top
        effectiveAnchor = anchor.replace('bottom', 'top') as PopupAnchor;
      }
    } else if (anchor === 'top-center' || anchor === 'top-left' || anchor === 'top-right') {
      // Check if popup would go above viewport
      if (centerWindow.y - Math.abs(offset.y) - popupHeight < 20) {
        // Flip to bottom
        effectiveAnchor = anchor.replace('top', 'bottom') as PopupAnchor;
      }
    }

    // Adaptive horizontal positioning
    if (centerWindow.x - popupWidth / 2 < 20) {
      // Too close to left edge, use left anchor
      effectiveAnchor = effectiveAnchor
        .replace('center', 'left')
        .replace('right', 'left') as PopupAnchor;
    } else if (centerWindow.x + popupWidth / 2 > viewportWidth - 20) {
      // Too close to right edge, use right anchor
      effectiveAnchor = effectiveAnchor
        .replace('center', 'right')
        .replace('left', 'right') as PopupAnchor;
    }
  }

  // Calculate anchor point in image coordinates
  let anchorImageX: number;
  let anchorImageY: number;

  switch (effectiveAnchor) {
    case 'top-left':
      anchorImageX = minX;
      anchorImageY = minY;
      break;
    case 'top-center':
      anchorImageX = (minX + maxX) / 2;
      anchorImageY = minY;
      break;
    case 'top-right':
      anchorImageX = maxX;
      anchorImageY = minY;
      break;
    case 'bottom-left':
      anchorImageX = minX;
      anchorImageY = maxY;
      break;
    case 'bottom-center':
      anchorImageX = (minX + maxX) / 2;
      anchorImageY = maxY;
      break;
    case 'bottom-right':
      anchorImageX = maxX;
      anchorImageY = maxY;
      break;
    case 'center':
      anchorImageX = (minX + maxX) / 2;
      anchorImageY = (minY + maxY) / 2;
      break;
  }

  // Convert to viewport coordinates
  const viewportPoint = viewer.viewport.imageToViewportCoordinates(anchorImageX, anchorImageY);

  // Convert to window coordinates
  const windowPoint = viewer.viewport.viewportToWindowCoordinates(viewportPoint);

  // Adjust offset based on effective anchor (flip offset if anchor was flipped)
  let adjustedOffsetY = offset.y;
  if (effectiveAnchor !== anchor) {
    // If anchor was flipped vertically, flip the offset too
    if (
      (anchor.includes('top') && effectiveAnchor.includes('bottom')) ||
      (anchor.includes('bottom') && effectiveAnchor.includes('top'))
    ) {
      adjustedOffsetY = -offset.y;
    }
  }

  // Calculate CSS transform based on effective anchor
  let transform: string;
  if (effectiveAnchor.includes('top')) {
    // Popup appears ABOVE annotation - anchor is at TOP of bounds
    // Shift popup UP by 100% so it sits above the anchor point
    if (effectiveAnchor.includes('left')) {
      transform = 'translate(0%, -100%)';
    } else if (effectiveAnchor.includes('right')) {
      transform = 'translate(-100%, -100%)';
    } else {
      transform = 'translate(-50%, -100%)';
    }
  } else if (effectiveAnchor.includes('bottom')) {
    // Popup appears BELOW annotation - anchor is at BOTTOM of bounds
    // Shift popup UP by 0% so it sits below the anchor point
    if (effectiveAnchor.includes('left')) {
      transform = 'translate(0%, 0%)';
    } else if (effectiveAnchor.includes('right')) {
      transform = 'translate(-100%, 0%)';
    } else {
      transform = 'translate(-50%, 0%)';
    }
  } else {
    // Center
    transform = 'translate(-50%, -50%)';
  }

  return {
    x: windowPoint.x + offset.x,
    y: windowPoint.y + adjustedOffsetY,
    anchorX: windowPoint.x,
    anchorY: windowPoint.y,
    transform,
  };
}

/**
 * OpenSeadragon Annotation Popup Component
 *
 * IMPORTANT: This component is completely unstyled.
 * You must add your own CSS to style the popup container and content.
 *
 * Example usage:
 * ```tsx
 * <AnnotationPopup
 *   viewer={viewer}
 *   annotation={selectedAnnotation}
 *   options={{ anchor: 'top-center', offset: { x: 0, y: -10 } }}
 * >
 *   <div className="my-popup">
 *     <h3>{annotation.properties?.name}</h3>
 *     <button onClick={() => onDelete(annotation.id)}>Delete</button>
 *   </div>
 * </AnnotationPopup>
 * ```
 */
export function AnnotationPopup({
  viewer,
  annotation,
  children,
  options = {},
  onClose,
}: AnnotationPopupProps) {
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const autoHideTimerRef = useRef<number | null>(null);

  const {
    anchor = 'top-center',
    offset = { x: 0, y: -10 },
    autoHideDelay = 0,
    hoverStayOpen = true,
  } = options;

  // Update popup position on viewport changes
  // Track annotation ID and bounds separately to avoid infinite loops from object reference changes
  const annotationId = annotation?.id;
  const annotationBounds = annotation?.shape.bounds;
  const boundsKey = annotationBounds
    ? `${annotationBounds.minX},${annotationBounds.minY},${annotationBounds.maxX},${annotationBounds.maxY}`
    : null;

  useEffect(() => {
    if (!viewer || !annotationId || !annotationBounds) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const newPosition = calculatePopupPosition(
        viewer,
        annotationBounds,
        anchor,
        offset,
        popupRef.current
      );
      setPosition(prev => {
        // Only update if position actually changed (avoid unnecessary re-renders)
        if (
          prev &&
          Math.abs(prev.x - newPosition.x) < 0.1 &&
          Math.abs(prev.y - newPosition.y) < 0.1
        ) {
          return prev;
        }
        return newPosition;
      });
    };

    // Initial position
    updatePosition();

    // Update on viewport changes (pan, zoom)
    const events = ['animation', 'pan', 'zoom', 'resize', 'rotate'] as const;
    events.forEach(event => {
      viewer.addHandler(event as any, updatePosition);
    });

    return () => {
      events.forEach(event => {
        viewer.removeHandler(event as any, updatePosition);
      });
    };
    // We use boundsKey (string) instead of annotationBounds (object) to avoid infinite loops
    // from object reference changes. annotationBounds is accessed via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, annotationId, boundsKey, anchor, offset]);

  // Auto-hide timer
  useEffect(() => {
    if (autoHideDelay > 0 && annotation) {
      autoHideTimerRef.current = window.setTimeout(() => {
        onClose?.();
      }, autoHideDelay);
    }

    return () => {
      if (autoHideTimerRef.current !== null) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [annotation, autoHideDelay, onClose]);

  // Handle hover to keep popup open
  const handleMouseEnter = () => {
    if (hoverStayOpen && autoHideTimerRef.current !== null) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (hoverStayOpen && autoHideDelay > 0) {
      autoHideTimerRef.current = window.setTimeout(() => {
        onClose?.();
      }, autoHideDelay);
    }
  };

  if (!annotation || !position) {
    return null;
  }

  return (
    <>
      {/* Overlay - clicking outside closes the popup */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
        onClick={onClose}
      />
      {/* Popup */}
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: position.transform,
          zIndex: 10001,
          pointerEvents: 'auto',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </>
  );
}
