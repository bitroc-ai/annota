/**
 * Annota React - Annotator Component
 * OpenSeadragon annotator wrapper
 */

import { useEffect, ReactNode } from 'react';
import type OpenSeadragon from 'openseadragon';
import {
  createOpenSeadragonAnnotator,
  type OpenSeadragonAnnotatorOptions,
  type OpenSeadragonAnnotator,
} from '../adapters/openseadragon/annotator';
import { useSetAnnotator } from './Provider';

/**
 * Annotator props
 */
export interface AnnotatorProps extends Omit<OpenSeadragonAnnotatorOptions, 'store'> {
  viewer: OpenSeadragon.Viewer | undefined;
  children?: ReactNode;
}

/**
 * Annotator
 * Creates and manages annotator lifecycle
 */
export function Annotator({ viewer, children, ...options }: AnnotatorProps) {
  const setAnnotator = useSetAnnotator();

  useEffect(() => {
    if (!viewer || !viewer.canvas) return;

    let cancelled = false;
    let annotatorInstance: OpenSeadragonAnnotator | undefined;

    console.log('Creating annotator with canvas ready');
    createOpenSeadragonAnnotator(viewer, options).then(annotator => {
      if (cancelled) {
        annotator.destroy();
        return;
      }
      annotatorInstance = annotator;
      setAnnotator(annotator);
    });

    return () => {
      cancelled = true;
      console.log('Destroying annotator');
      if (annotatorInstance) {
        annotatorInstance.destroy();
      }
      setAnnotator(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]); // Only depend on viewer

  return <>{children}</>;
}
