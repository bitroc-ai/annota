/**
 * Context Menu Hook
 *
 * Manages context menu state for viewer and annotations
 * Handles right-click events and provides menu positioning
 */

import { useEffect, useState, useCallback } from 'react';
import type { Annotation } from '../../core/types';

export interface ContextMenuState {
  position: { x: number; y: number } | null;
  annotation: Annotation | null;
  type: 'viewer' | 'annotation' | null;
}

export interface UseContextMenuResult {
  /** Current context menu state */
  menuState: ContextMenuState;

  /** Show context menu at position for viewer */
  showViewerMenu: (x: number, y: number) => void;

  /** Show context menu at position for annotation */
  showAnnotationMenu: (annotation: Annotation, x: number, y: number) => void;

  /** Hide context menu */
  hideMenu: () => void;
}

export function useContextMenu(): UseContextMenuResult {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    position: null,
    annotation: null,
    type: null,
  });

  const showViewerMenu = useCallback((x: number, y: number) => {
    setMenuState({
      position: { x, y },
      annotation: null,
      type: 'viewer',
    });
  }, []);

  const showAnnotationMenu = useCallback((annotation: Annotation, x: number, y: number) => {
    setMenuState({
      position: { x, y },
      annotation,
      type: 'annotation',
    });
  }, []);

  const hideMenu = useCallback(() => {
    setMenuState({
      position: null,
      annotation: null,
      type: null,
    });
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuState.position) {
        hideMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuState.position, hideMenu]);

  return {
    menuState,
    showViewerMenu,
    showAnnotationMenu,
    hideMenu,
  };
}
