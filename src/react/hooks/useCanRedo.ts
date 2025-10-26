/**
 * Hook that returns whether redo is available
 *
 * @example
 * ```tsx
 * const canRedo = useCanRedo();
 * <button disabled={!canRedo} onClick={() => annotator.redo()}>Redo</button>
 * ```
 */

import { useHistory } from './useHistory';

export function useCanRedo(): boolean {
  const history = useHistory();
  return history.canRedo;
}
