/**
 * Annota Loaders - JSON Format
 * Load JSON annotation files
 */

import type { Annotation } from '../core/types';

/**
 * Load annotations from JSON file
 */
export async function loadJSONFile(filePath: string): Promise<Annotation[]> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[JSON Loader] Failed to load file:', error);
    throw new Error(`Failed to load JSON file: ${filePath}`);
  }
}

/**
 * Export annotations to JSON string
 */
export function annotationsToJSON(annotations: Annotation[]): string {
  return JSON.stringify(annotations, null, 2);
}

/**
 * Parse JSON string to annotations
 */
export function parseJSON(json: string): Annotation[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[JSON Loader] Failed to parse JSON:', error);
    throw new Error('Invalid JSON format');
  }
}
