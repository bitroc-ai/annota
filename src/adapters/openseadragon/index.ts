/**
 * Annota Adapter - OpenSeadragon
 */

export { createOpenSeadragonAnnotator } from './annotator';
export type {
  OpenSeadragonAnnotator,
  OpenSeadragonAnnotatorOptions,
  OpenSeadragonAnnotatorState,
} from './annotator';

export {
  viewportToImage,
  imageToViewport,
  pixelToViewport,
  viewportToPixel,
  pointerEventToImage,
  getViewportBounds,
} from './coordinates';

// Legacy adapter (will be removed)
export { OpenSeadragonAdapter } from './adapter';
