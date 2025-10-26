/**
 * Hook to get a specific annotation by ID
 */

import { useEffect, useState } from 'react';
import { useAnnotationStore } from '../Provider';
import type { Annotation } from '../../core/types';

export function useAnnotation(id: string): Annotation | undefined {
  const store = useAnnotationStore();
  const [annotation, setAnnotation] = useState<Annotation | undefined>(store?.get(id));

  useEffect(() => {
    if (!store) return;

    const handleChange = (event: any) => {
      const updated = event.updated.find((u: any) => u.oldValue.id === id || u.newValue.id === id);

      if (updated) {
        setAnnotation(updated.newValue);
      }

      const deleted = event.deleted.find((a: any) => a.id === id);
      if (deleted) {
        setAnnotation(undefined);
      }
    };

    // Initial load
    setAnnotation(store.get(id));

    store.observe(handleChange);
    return () => store.unobserve(handleChange);
  }, [store, id]);

  return annotation;
}
