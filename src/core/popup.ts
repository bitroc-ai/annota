/**
 * Popup position in viewport coordinates.
 */
export interface PopupPosition {
  x: number;
  y: number;
  /** Anchor point where the popup points. */
  anchorX: number;
  anchorY: number;
  /** CSS transform used to position the popup. */
  transform: string;
}

/**
 * Popup anchor position relative to an annotation.
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
 * Framework-neutral popup configuration.
 */
export interface PopupOptions {
  /** Where to anchor the popup relative to annotation bounds. */
  anchor?: PopupAnchor;
  /** Offset from the anchor point in pixels. */
  offset?: { x: number; y: number };
  /** Show the popup on hover instead of click. */
  showOnHover?: boolean;
  /** Auto-hide delay in milliseconds; zero disables auto-hide. */
  autoHideDelay?: number;
  /** Keep the popup open while hovering over it. */
  hoverStayOpen?: boolean;
}
