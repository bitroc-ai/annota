import { getContext } from 'svelte';
import { ANNOTA_CONTEXT_KEY, type AnnotaContextValue } from './context';

export function getAnnotator() {
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

export function setAnnotator() {
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

