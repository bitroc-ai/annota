import { getContext } from 'svelte';
import type { OpenSeadragonAnnotator } from 'annota';
import { ANNOTA_CONTEXT_KEY, type AnnotaContextValue } from './context';

export function getAnnotator(): () => OpenSeadragonAnnotator | undefined {
  try {
    const context = getContext<AnnotaContextValue>(ANNOTA_CONTEXT_KEY);
    if (!context) {
      // During SSR or outside provider, return a function that returns undefined
      return () => undefined;
    }
    return () => context.annotator;
  } catch (e) {
    // getContext can throw during SSR
    return () => undefined;
  }
}

export function setAnnotator(): (
  annotator: OpenSeadragonAnnotator | undefined
) => void {
  try {
    const context = getContext<AnnotaContextValue>(ANNOTA_CONTEXT_KEY);
    if (!context) {
      // During SSR or outside provider, return a no-op function
      return () => {};
    }
    return context.setAnnotator;
  } catch (e) {
    // getContext can throw during SSR
    return () => {};
  }
}
