import type { OpenSeadragonAnnotator } from '../adapters/openseadragon/annotator';

export const ANNOTA_CONTEXT_KEY = Symbol('annota-context');

export interface AnnotaContextValue {
  annotator: OpenSeadragonAnnotator | undefined;
  setAnnotator: (annotator: OpenSeadragonAnnotator | undefined) => void;
}
