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
}

export const initKeyboardCommands = (
  annotator: OpenSeadragonAnnotator,
  options: KeyboardCommandsOptions = {}
) => {
  const {
    container = document,
    enableDelete = true,
  } = options;

  const handleKeyDown = (evt: Event) => {
    const event = evt as KeyboardEvent;

    // Delete/Backspace: delete selected annotations
    if (enableDelete && (event.key === 'Delete' || event.key === 'Backspace')) {
      const selectedIds = annotator.state.selection.selected;

      if (selectedIds.length > 0) {
        // Prevent backspace from navigating back in browser
        event.preventDefault();

        // Delete all selected annotations
        selectedIds.forEach(id => {
          annotator.state.store.delete(id);
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
