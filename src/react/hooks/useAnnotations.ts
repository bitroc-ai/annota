/**
 * Hook to get all annotations
 */

import { useEffect, useState } from 'react';
import { useAnnotationStore } from '../Provider';
import type { Annotation } from '../../core/types';

export function useAnnotations(): Annotation[] {
  const store = useAnnotationStore();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    if (!store) return;

    const handleChange = () => {
      setAnnotations(store.all());
    };

    // Initial load
    handleChange();

    store.observe(handleChange);
    return () => store.unobserve(handleChange);
  }, [store]);

  return annotations;
}
