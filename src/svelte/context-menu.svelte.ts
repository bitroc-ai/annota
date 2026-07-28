// Svelte 5 runes ($state, $effect) are global in .svelte.ts files and don't need to be imported.

import type { Annotation } from 'annota';


export interface ContextMenuState {
  position: { x: number; y: number } | null;
  annotation: Annotation | null;
  type: 'viewer' | 'annotation' | null;
}

export function contextMenu() {
  // We use a mutable object for state
  let menuState = $state<ContextMenuState>({
    position: null,
    annotation: null,
    type: null
  });

  function showViewerMenu(x: number, y: number) {
    menuState.position = { x, y };
    menuState.annotation = null;
    menuState.type = 'viewer';
  }

  function showAnnotationMenu(annotation: Annotation, x: number, y: number) {
    menuState.position = { x, y };
    menuState.annotation = annotation;
    menuState.type = 'annotation';
  }

  function hideMenu() {
    menuState.position = null;
    menuState.annotation = null;
    menuState.type = null;
  }

  $effect(() => {
    if (typeof document === 'undefined') return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuState.position) {
        hideMenu();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  });

  return {
    get menuState() { return menuState; },
    showViewerMenu,
    showAnnotationMenu,
    hideMenu
  };
}
