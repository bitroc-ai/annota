/**
 * Keyboard commands for annotation management
 */

import type { OpenSeadragonAnnotator } from '../adapters/openseadragon/annotator';

export const isMac = (() => {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.indexOf('Mac OS X') !== -1;
})();

export interface KeyboardCommandsOptions {
  /** Element to attach keyboard listeners to. Defaults to document */
  container?: Element | Document;
  /** Whether to enable Delete/Backspace to delete selected annotations */
  enableDelete?: boolean;
  /** Whether to enable Ctrl/Cmd+Z for undo and Ctrl/Cmd+Shift+Z for redo */
  enableUndoRedo?: boolean;
}

export const initKeyboardCommands = (
  annotator: OpenSeadragonAnnotator,
  options: KeyboardCommandsOptions = {}
) => {
  const {
    container = document,
    enableDelete = true,
    enableUndoRedo = true,
  } = options;

  const handleKeyDown = (evt: Event) => {
    const event = evt as KeyboardEvent;
    const cmdKey = isMac ? event.metaKey : event.ctrlKey;

    // Undo: Ctrl/Cmd+Z (without Shift)
    if (enableUndoRedo && cmdKey && event.key === 'z' && !event.shiftKey) {
      if (annotator.canUndo()) {
        event.preventDefault();
        annotator.undo();
      }
      return;
    }

    // Redo: Ctrl/Cmd+Shift+Z
    if (enableUndoRedo && cmdKey && event.key === 'z' && event.shiftKey) {
      if (annotator.canRedo()) {
        event.preventDefault();
        annotator.redo();
      }
      return;
    }

    // Delete/Backspace: delete selected annotations
    if (enableDelete && (event.key === 'Delete' || event.key === 'Backspace')) {
      const selectedIds = annotator.state.selection.selected;

      if (selectedIds.length > 0) {
        // Prevent backspace from navigating back in browser
        event.preventDefault();

        // Delete all selected annotations using history
        selectedIds.forEach(id => {
          annotator.deleteAnnotation(id);
        });

        // Clear selection
        annotator.state.selection.selected = [];
      }
    }
  };

  const destroy = () => {
    container.removeEventListener('keydown', handleKeyDown);
  };

  container.addEventListener('keydown', handleKeyDown);

  return {
    destroy
  };
};
