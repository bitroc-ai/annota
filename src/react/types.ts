/**
 * Popup system types for Annota
 *
 * Based on Annotorious popup pattern with customization for our needs.
 * Supports both Image and OpenSeadragon viewers.
 */

import type { Annotation } from '../core/types';

/**
 * Popup position in viewport coordinates
 */
export interface PopupPosition {
  x: number;
  y: number;
  /** Anchor point (where the popup points to) */
  anchorX: number;
  anchorY: number;
  /** CSS transform to apply for positioning */
  transform: string;
}

/**
 * Popup anchor position relative to annotation
 */
export type PopupAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center';

/**
 * Props passed to custom popup components
 */
export interface AnnotationPopupProps {
  /** The annotation being displayed */
  annotation: Annotation;

  /** Position in viewport coordinates */
  position: PopupPosition;

  /** Update annotation properties */
  onUpdateProperties?: (annotationId: string, properties: Record<string, unknown>) => void;

  /** Update annotation style */
  onUpdateStyle?: (annotationId: string, style: Partial<Annotation['style']>) => void;

  /** Delete the annotation */
  onDelete?: (annotationId: string) => void;

  /** Close the popup */
  onClose?: () => void;
}

/**
 * Popup configuration options
 */
export interface PopupOptions {
  /** Where to anchor the popup relative to annotation bounds */
  anchor?: PopupAnchor;

  /** Offset from anchor point in pixels */
  offset?: { x: number; y: number };

  /** Show popup on hover instead of click */
  showOnHover?: boolean;

  /** Auto-hide popup after delay (ms), 0 = never */
  autoHideDelay?: number;

  /** Keep popup open when hovering over it */
  hoverStayOpen?: boolean;
}

/**
 * Popup state managed by the popup system
 */
export interface PopupState {
  /** Currently visible popup's annotation ID */
  annotationId: string | null;

  /** Current popup position */
  position: PopupPosition | null;

  /** Whether popup is visible */
  visible: boolean;
}
