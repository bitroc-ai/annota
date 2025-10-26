/**
 * Hook to get history state (canUndo, canRedo, etc.)
 *
 * @example
 * ```tsx
 * function HistoryControls() {
 *   const history = useHistory();
 *
 *   return (
 *     <div>
 *       <button onClick={history.undo} disabled={!history.canUndo}>
 *         Undo
 *       </button>
 *       <button onClick={history.redo} disabled={!history.canRedo}>
 *         Redo
 *       </button>
 *       <span>{history.undoSize} undos, {history.redoSize} redos</span>
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { useAnnotator } from '../Provider';
import type { HistoryStateEvent } from '../../core/history';

export interface UseHistoryResult {
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

export function useHistory(): UseHistoryResult {
  const annotator = useAnnotator();
  const [historyState, setHistoryState] = useState<HistoryStateEvent>({
    canUndo: false,
    canRedo: false,
    undoSize: 0,
    redoSize: 0,
  });

  useEffect(() => {
    if (!annotator) return;

    const historyManager = annotator.state.history;
    if (!historyManager) return;

    const handleHistoryChange = (event: HistoryStateEvent) => {
      setHistoryState(event);
    };

    // Initial state
    setHistoryState({
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo(),
      undoSize: historyManager.getUndoSize(),
      redoSize: historyManager.getRedoSize(),
    });

    historyManager.observe(handleHistoryChange);
    return () => historyManager.unobserve(handleHistoryChange);
  }, [annotator]);

  const undo = useCallback(() => {
    if (!annotator) return;
    annotator.undo();
  }, [annotator]);

  const redo = useCallback(() => {
    if (!annotator) return;
    annotator.redo();
  }, [annotator]);

  const clear = useCallback(() => {
    if (!annotator) return;
    annotator.clearHistory();
  }, [annotator]);

  return {
    ...historyState,
    undo,
    redo,
    clear,
  };
}
