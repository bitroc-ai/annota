/**
 * Annotation Editors
 * Shape-specific editor components
 */

export { PointEditor, editPoint } from './point';
export type { PointEditorProps } from './point';

export { RectangleEditor, editRectangle } from './rectangle';
export type { RectangleEditorProps } from './rectangle';

export { PolygonEditor, editPolygon, deletePolygonVertex } from './polygon';
export type { PolygonEditorProps } from './polygon';

export { FreehandEditor, editFreehand } from './freehand';
export type { FreehandEditorProps } from './freehand';

export { ImageEditor, editImage } from './image';
export type { ImageEditorProps } from './image';
