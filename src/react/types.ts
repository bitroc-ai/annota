/**
 * Popup system types for Annota
 *
 * Based on Annotorious popup pattern with customization for our needs.
 * Supports both Image and OpenSeadragon viewers.
 */

import type { PopupPosition } from '../core/popup';
import type { Annotation } from '../core/types';

export type { PopupAnchor, PopupOptions, PopupPosition } from '../core/popup';

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
