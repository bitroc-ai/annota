/**
 * Annota React - Provider Component
 * Context provider for annotation state
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import type { OpenSeadragonAnnotator } from '../adapters/openseadragon/annotator';

/**
 * Context value
 */
interface AnnotaContextValue {
  annotator?: OpenSeadragonAnnotator;
  setAnnotator: (annotator: OpenSeadragonAnnotator | undefined) => void;
}

const AnnotaContext = createContext<AnnotaContextValue>({
  annotator: undefined,
  setAnnotator: () => {},
});

/**
 * Provider props
 */
export interface AnnotaProviderProps {
  children: ReactNode;
}

/**
 * Annota Provider
 * Provides annotation context to child components
 */
export function AnnotaProvider({ children }: AnnotaProviderProps) {
  const [annotator, setAnnotator] = useState<OpenSeadragonAnnotator>();

  return (
    <AnnotaContext.Provider value={{ annotator, setAnnotator }}>{children}</AnnotaContext.Provider>
  );
}

/**
 * Hook to access annotator
 */
export function useAnnotator(): OpenSeadragonAnnotator | undefined {
  const { annotator } = useContext(AnnotaContext);
  return annotator;
}

/**
 * Hook to access annotation store
 */
export function useAnnotationStore() {
  const annotator = useAnnotator();
  return annotator?.state.store;
}

/**
 * Internal hook to set annotator (used by Annotator component)
 */
export function useSetAnnotator() {
  const { setAnnotator } = useContext(AnnotaContext);
  return setAnnotator;
}
