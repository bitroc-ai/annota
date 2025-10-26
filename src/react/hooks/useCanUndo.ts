/**
 * Hook that returns whether undo is available
 *
 * @example
 * ```tsx
 * const canUndo = useCanUndo();
 * <button disabled={!canUndo} onClick={() => annotator.undo()}>Undo</button>
 * ```
 */

import { useHistory } from './useHistory';

export function useCanUndo(): boolean {
  const history = useHistory();
  return history.canUndo;
}
