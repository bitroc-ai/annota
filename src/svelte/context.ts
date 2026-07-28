import type { OpenSeadragonAnnotator } from 'annota';

export const ANNOTA_CONTEXT_KEY = Symbol('annota-context');

export interface AnnotaContextValue {
  annotator: OpenSeadragonAnnotator | undefined;
  setAnnotator: (annotator: OpenSeadragonAnnotator | undefined) => void;
}
