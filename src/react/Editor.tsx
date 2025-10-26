/**
 * Annotation Editor
 *
 * Drag-and-drop editing system for annotations.
 * Combines viewport synchronization and drag handling infrastructure.
 *
 * Architecture:
 * - SvgLayer: Syncs SVG overlay with OpenSeadragon viewport (zoom, pan, rotation)
 * - EditorWrapper: Handles drag events and coordinate transformation
 * - Shape editors: Individual files in /editors (Point.tsx, Rectangle.tsx, etc.)
 */

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import OpenSeadragon from 'openseadragon';
import { useSelection, useEditing } from './hooks';
import { useAnnotator } from './Provider';
import './Editor.css';
import {
  PointEditor,
  editPoint,
  RectangleEditor,
  editRectangle,
  PolygonEditor,
  editPolygon,
  deletePolygonVertex,
} from './editors';
import type { Annotation, Shape } from '../core/types';

// ============================================================================
// SVG Layer - Viewport Synchronization
// ============================================================================

interface SvgLayerProps {
  viewer: OpenSeadragon.Viewer;
  children: ReactNode;
}

function SvgLayer({ viewer, children }: SvgLayerProps) {
  const [transform, setTransform] = useState('');
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Mount inside .openseadragon-canvas like Annotorious does
    const canvas = viewer.element.querySelector('.openseadragon-canvas') as HTMLElement;
    setContainer(canvas);
  }, [viewer]);

  useEffect(() => {
    const onUpdateViewport = () => {
      // Match the Pixi.js stage transformation calculation exactly
      // From stage.ts lines 270-287
      const containerWidth = viewer.viewport.getContainerSize().x;
      const zoom = viewer.viewport.getZoom(true);
      const flipped = viewer.viewport.getFlip();

      // Calculate scale (same as Pixi.js)
      const scale = (zoom * containerWidth) / viewer.world.getContentFactor();
      const scaleY = scale;
      const scaleX = flipped ? -scale : scale;

      // Get viewport bounds in image coordinates (same as Pixi.js)
      const viewportBounds = viewer.viewport.viewportToImageRectangle(
        viewer.viewport.getBounds(true)
      );

      // Calculate position (same as Pixi.js)
      const dx = -viewportBounds.x * scale;
      const dy = -viewportBounds.y * scale;

      // Get rotation (OSD 4+)
      const rotation = viewer.viewport.getRotation ? viewer.viewport.getRotation() : 0;

      // Build transform matching Pixi.js stage
      const layerTransform = `translate(${dx}, ${dy}) scale(${scaleX}, ${scaleY}) rotate(${rotation})`;

      setTransform(layerTransform);
    };

    // Initial update
    onUpdateViewport();

    // Listen to viewport changes
    viewer.addHandler('update-viewport', onUpdateViewport);

    return () => {
      viewer.removeHandler('update-viewport', onUpdateViewport);
    };
  }, [viewer]);

  if (!container) return null;

  const svg = (
    <svg
      className="annota-svg-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        zIndex: 1000,
      }}
    >
      <g className="annota-transform-group" transform={transform}>
        {children}
      </g>
    </svg>
  );

  // Mount inside .openseadragon-canvas using portal
  return createPortal(svg, container);
}

// ============================================================================
// Editor Wrapper - Drag Handling & Coordinate Transformation
// ============================================================================

interface EditorWrapperProps {
  viewer: OpenSeadragon.Viewer;
  annotation: Annotation;
  onChange: (shape: Shape) => void;
  editor: (shape: Shape, handle: string, delta: [number, number]) => Shape;
  children: (
    onGrab: (handle: string) => (e: React.PointerEvent<SVGElement>) => void,
    displayAnnotation: Annotation
  ) => ReactNode;
}

/**
 * Convert client coordinates to image coordinates using OpenSeadragon viewport
 */
function clientToImageCoords(
  viewer: OpenSeadragon.Viewer,
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): [number, number] {
  // Get the SVG element's bounding rect to convert client coords to element coords
  const rect = svg.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;

  // Use OpenSeadragon's viewport API for accurate conversion
  const imageCoords = viewer.viewport.viewerElementToImageCoordinates(
    new OpenSeadragon.Point(offsetX, offsetY)
  );

  return [imageCoords.x, imageCoords.y];
}

function EditorWrapper({ viewer, annotation, onChange, editor, children }: EditorWrapperProps) {
  const [grabbedHandle, setGrabbedHandle] = useState<string | null>(null);
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [initialShape, setInitialShape] = useState<Shape | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);

  const onGrab = useCallback(
    (handle: string) => (evt: React.PointerEvent<SVGElement>) => {
      evt.stopPropagation();
      evt.preventDefault();

      const svg = evt.currentTarget.ownerSVGElement;
      if (!svg) return;

      // Convert to image coordinates using OpenSeadragon viewport
      const imageCoords = clientToImageCoords(viewer, svg, evt.clientX, evt.clientY);

      // Use currentShape if it exists (from previous drag), otherwise use annotation.shape
      const shapeToUse = currentShape || annotation.shape;

      setGrabbedHandle(handle);
      setOrigin(imageCoords);
      setInitialShape(shapeToUse);
      setCurrentShape(shapeToUse);

      // Disable OpenSeadragon panning
      viewer.setMouseNavEnabled(false);

      // Capture pointer to this element
      evt.currentTarget.setPointerCapture(evt.pointerId);
    },
    [annotation.shape, currentShape, viewer]
  );

  const onPointerMove = useCallback(
    (evt: React.PointerEvent<SVGGElement>) => {
      if (!grabbedHandle || !origin || !initialShape) return;

      const svg = evt.currentTarget.ownerSVGElement;
      if (!svg) return;

      // Convert current position to image coordinates using OpenSeadragon viewport
      const [x, y] = clientToImageCoords(viewer, svg, evt.clientX, evt.clientY);

      // Calculate delta from origin
      const delta: [number, number] = [x - origin[0], y - origin[1]];

      // Call shape-specific editor function
      const newShape = editor(initialShape, grabbedHandle, delta);
      setCurrentShape(newShape);
      onChange(newShape);
    },
    [grabbedHandle, origin, initialShape, editor, onChange, viewer]
  );

  const onPointerUp = useCallback(
    (evt: React.PointerEvent<SVGElement>) => {
      if (!grabbedHandle) return;

      const target = evt.currentTarget as Element;
      target.releasePointerCapture(evt.pointerId);

      // Re-enable OpenSeadragon panning
      viewer.setMouseNavEnabled(true);

      setGrabbedHandle(null);
      setOrigin(null);
      setInitialShape(null);
      // Don't clear currentShape immediately - let it clear on next render
      // This prevents flickering back to old position
    },
    [grabbedHandle, viewer]
  );

  // Clear currentShape when annotation updates from store (after drag ends)
  useEffect(() => {
    if (!grabbedHandle && currentShape) {
      // Only clear currentShape if the annotation from store has caught up
      // Compare the shapes to see if they match
      const shapesMatch = JSON.stringify(currentShape) === JSON.stringify(annotation.shape);
      if (shapesMatch) {
        setCurrentShape(null);
      }
    }
  }, [grabbedHandle, currentShape, annotation.shape]);

  // Use current dragged shape if dragging, otherwise use annotation's shape
  const displayAnnotation = currentShape ? { ...annotation, shape: currentShape } : annotation;

  return (
    <g
      className="annota-editor-wrapper annota-editor-group"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children(onGrab, displayAnnotation)}
    </g>
  );
}

// ============================================================================
// Main Annotation Editor Component
// ============================================================================

// ============================================================================
// Shape Editor Registry - Extensibility for Custom Shapes
// ============================================================================

export interface ShapeEditorConfig {
  /** Pure function that calculates new shape based on delta */
  editFn: (shape: Shape, handle: string, delta: [number, number]) => Shape;
  /** React component that renders the editor UI */
  component: (props: {
    annotation: Annotation;
    scale: number;
    onGrab: (handle: string) => (e: React.PointerEvent<SVGElement>) => void;
  }) => React.ReactElement | null;
  /** Whether this shape supports vertex editing mode */
  supportsVertexEditing?: boolean;
}

// Built-in shape editors
const defaultEditors: Record<string, ShapeEditorConfig> = {
  point: {
    editFn: (shape, handle, delta) => {
      if (shape.type !== 'point') return shape;
      return editPoint(shape, handle, delta);
    },
    component: PointEditor,
    supportsVertexEditing: false,
  },
  rectangle: {
    editFn: (shape, handle, delta) => {
      if (shape.type !== 'rectangle') return shape;
      return editRectangle(shape, handle, delta);
    },
    component: RectangleEditor,
    supportsVertexEditing: false,
  },
  polygon: {
    editFn: (shape, handle, delta) => {
      if (shape.type !== 'polygon') return shape;
      return editPolygon(shape, handle, delta);
    },
    component: PolygonEditor,
    supportsVertexEditing: true,
  },
};

// Custom editor registry (for apps to extend)
const customEditors: Record<string, ShapeEditorConfig> = {};

/**
 * Get the editor configuration for an annotation
 * Checks custom editors first, then falls back to built-in editors
 */
export function getEditorConfig(annotation: Annotation): ShapeEditorConfig | undefined {
  const shapeType = annotation.shape.type;
  return customEditors[shapeType] || defaultEditors[shapeType];
}

/**
 * Register a custom shape editor
 *
 * @example
 * ```tsx
 * import { registerShapeEditor } from 'annota';
 *
 * registerShapeEditor('circle', {
 *   editFn: (shape, handle, delta) => {
 *     // Calculate new circle position/size
 *     return { ...shape, ... };
 *   },
 *   component: CircleEditor, // Your custom React component
 * });
 * ```
 */
export function registerShapeEditor(shapeType: string, config: ShapeEditorConfig) {
  customEditors[shapeType] = config;
}

/**
 * Unregister a custom shape editor
 */
export function unregisterShapeEditor(shapeType: string) {
  delete customEditors[shapeType];
}

// ============================================================================
// Main Annotation Editor Component
// ============================================================================

export interface AnnotationEditorProps {
  viewer: OpenSeadragon.Viewer;
  scale?: number; // Viewport scale for handle sizing
}

export function AnnotationEditor({ viewer }: AnnotationEditorProps) {
  const selectedAnnotations = useSelection();
  const annotator = useAnnotator();
  const { editingId } = useEditing();
  const [scale, setScale] = useState(1);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);

  // Calculate viewport scale on viewport changes
  useEffect(() => {
    if (!viewer || !viewer.viewport) return;

    const updateScale = () => {
      const containerWidth = viewer.viewport.getContainerSize().x;
      const zoom = viewer.viewport.getZoom(true);
      const calculatedScale = (zoom * containerWidth) / viewer.world.getContentFactor();
      setScale(calculatedScale);
    };

    updateScale();
    viewer.addHandler('update-viewport', updateScale);
    viewer.addHandler('animation', updateScale);

    return () => {
      viewer.removeHandler('update-viewport', updateScale);
      viewer.removeHandler('animation', updateScale);
    };
  }, [viewer]);

  // Only support single selection for now
  const annotation = selectedAnnotations[0];

  // Clear selected vertex when annotation changes
  useEffect(() => {
    setSelectedVertexIndex(null);
  }, [annotation?.id]);

  // Handle vertex deletion with Delete/Backspace keys
  useEffect(() => {
    if (!annotation || !annotator) return;

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (annotation.shape.type !== 'polygon') return;
      if (selectedVertexIndex === null) return;
      if (evt.key !== 'Delete' && evt.key !== 'Backspace') return;

      // Prevent event from bubbling to global shortcuts that would delete the whole annotation
      evt.preventDefault();
      evt.stopPropagation();

      const newShape = deletePolygonVertex(annotation.shape as any, selectedVertexIndex);

      if (newShape) {
        annotator.updateAnnotation(annotation.id, { ...annotation, shape: newShape });
        setSelectedVertexIndex(null);
      } else {
        console.warn('[AnnotationEditor] Cannot delete vertex: polygon must have at least 3 vertices');
      }
    };

    // Use capture phase to intercept event before it reaches global handlers
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [annotation, selectedVertexIndex, annotator]);

  if (!annotation || !annotator) return null;

  const handleChange = (shape: Shape) => {
    annotator.updateAnnotation(annotation.id, { ...annotation, shape });
  };

  // Get the appropriate editor for this shape type
  const getEditor = () => {
    const shapeType = annotation.shape.type;

    // Check custom editors first, then fall back to built-in
    const editorConfig = customEditors[shapeType] || defaultEditors[shapeType];

    if (!editorConfig) {
      console.warn(`[AnnotationEditor] No editor registered for shape type: ${shapeType}`);
      return null;
    }

    const { editFn, component: EditorComponent } = editorConfig;

    // Pass additional props for polygon editor
    const editorProps: any = {
      annotation: annotation,
      scale,
      onGrab: () => {},
    };

    // Add polygon-specific props
    if (shapeType === 'polygon') {
      editorProps.selectedVertexIndex = selectedVertexIndex;
      editorProps.onVertexSelect = setSelectedVertexIndex;
      editorProps.isEditing = editingId === annotation.id;
    }

    return (
      <EditorWrapper
        viewer={viewer}
        annotation={annotation}
        onChange={handleChange}
        editor={editFn}
      >
        {(onGrab, displayAnnotation) => (
          <EditorComponent
            {...editorProps}
            annotation={displayAnnotation}
            onGrab={onGrab}
          />
        )}
      </EditorWrapper>
    );
  };

  // Wrap editor in SVG layer that syncs with OSD viewport
  return <SvgLayer viewer={viewer}>{getEditor()}</SvgLayer>;
}
