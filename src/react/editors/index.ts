/**
 * Annotation Editors
 * Shape-specific editor components
 */

export { PointEditor, editPoint } from './Point';
export type { PointEditorProps } from './Point';

export { RectangleEditor, editRectangle } from './Rectangle';
export type { RectangleEditorProps } from './Rectangle';

export { PolygonEditor, editPolygon, deletePolygonVertex } from './Polygon';
export type { PolygonEditorProps } from './Polygon';

export { FreehandEditor, editFreehand } from './Freehand';
export type { FreehandEditorProps } from './Freehand';
