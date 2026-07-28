/**
 * Function to get history state (canUndo, canRedo, etc.)
 */

import { getAnnotator } from './annotator';
import type { HistoryStateEvent } from 'annota';

export interface HistoryResult {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of items in undo stack */
  undoSize: number;
  /** Number of items in redo stack */
  redoSize: number;
  /** Perform undo */
  undo: () => void;
  /** Perform redo */
  redo: () => void;
  /** Clear all history */
  clear: () => void;
}

export function history(): HistoryResult {
  const getAnnotatorFn = getAnnotator();
  let historyState: HistoryStateEvent = $state({
    canUndo: false,
    canRedo: false,
    undoSize: 0,
    redoSize: 0,
  });

  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator) {
      historyState = {
        canUndo: false,
        canRedo: false,
        undoSize: 0,
        redoSize: 0,
      };
      return;
    }

    const historyManager = annotator.unsafeState.history;
    if (!historyManager) {
      historyState = {
        canUndo: false,
        canRedo: false,
        undoSize: 0,
        redoSize: 0,
      };
      return;
    }

    const handleHistoryChange = (event: HistoryStateEvent) => {
      historyState = event;
    };

    // Initial state
    historyState = {
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo(),
      undoSize: historyManager.getUndoSize(),
      redoSize: historyManager.getRedoSize(),
    };

    historyManager.observe(handleHistoryChange);
    return () => historyManager.unobserve(handleHistoryChange);
  });

  function undo() {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.undo();
  }

  function redo() {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.redo();
  }

  function clear() {
    const annotator = getAnnotatorFn();
    if (!annotator) return;
    annotator.clearHistory();
  }

  return {
    get canUndo() { return historyState.canUndo; },
    get canRedo() { return historyState.canRedo; },
    get undoSize() { return historyState.undoSize; },
    get redoSize() { return historyState.redoSize; },
    undo,
    redo,
    clear,
  };
}
