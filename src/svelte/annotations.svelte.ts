/**
 * Function to get all annotations
 * Returns a getter function to access the reactive annotations list
 */

import { getAnnotator } from './annotator';
import type { Annotation } from '../core/types';

export function annotations(): () => Annotation[] {
  const getAnnotatorFn = getAnnotator();
  let annotationsList: Annotation[] = $state([]);

  $effect(() => {
    const annotator = getAnnotatorFn();
    if (!annotator) {
      annotationsList = [];
      return;
    }

    const store = annotator.state.store;
    if (!store) {
      annotationsList = [];
      return;
    }

    const handleStoreChange = () => {
      annotationsList = [...store.all()];
    };

    // Initial load
    handleStoreChange();

    // Observe store changes
    store.observe(handleStoreChange);

    return () => {
      store.unobserve(handleStoreChange);
    };
  });

  // Return a getter function to maintain reactivity
  return () => annotationsList;
}

