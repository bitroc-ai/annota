import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ALLOWED_ANNOTA_IMPORTS = new Set([
  'annota',
  'annota/react',
  'annota/svelte',
  'annota/tools',
  'annota/loaders',
  'annota/styles.css',
]);

const REACT_EXPORTS = new Set([
  'AnnotaProvider',
  'AnnotaProviderProps',
  'AnnotaViewer',
  'AnnotaViewerProps',
  'AnnotationEditor',
  'AnnotationEditorProps',
  'AnnotationPopup',
  'Annotator',
  'AnnotatorProps',
  'ContextMenu',
  'ContextMenuDivider',
  'ContextMenuItem',
  'ContextMenuItemProps',
  'ContextMenuPosition',
  'ContextMenuProps',
  'ContextMenuState',
  'FreehandEditor',
  'FreehandEditorProps',
  'PointEditor',
  'PointEditorProps',
  'PolygonEditor',
  'PolygonEditorProps',
  'PopupAnchor',
  'PopupOptions',
  'PopupPosition',
  'RectangleEditor',
  'RectangleEditorProps',
  'ShapeEditorConfig',
  'UseContextMenuResult',
  'UseEditingResult',
  'UseHistoryResult',
  'UseLayerManagerResult',
  'UsePopupResult',
  'UseToolOptions',
  'UseViewerResult',
  'Viewer',
  'ViewerProps',
  'getEditorConfig',
  'registerShapeEditor',
  'unregisterShapeEditor',
  'useAnnotation',
  'useAnnotationDoubleClick',
  'useAnnotationStore',
  'useAnnotations',
  'useAnnotator',
  'useCanRedo',
  'useCanUndo',
  'useContextMenu',
  'useContextMenuBinding',
  'useEditing',
  'useHistory',
  'useHover',
  'useImageLayerVisibility',
  'useLayer',
  'useLayerManager',
  'useLayers',
  'usePopup',
  'usePushToolCursor',
  'useSelection',
  'useTool',
  'useViewer',
]);

const TOOL_EXPORTS = new Set([
  'BaseTool',
  'ContourDetectOptions',
  'ContourDetectionResult',
  'ContourDetector',
  'ContourTool',
  'CurveTool',
  'CurveToolOptions',
  'MaskStats',
  'MoveToolOptions',
  'PointTool',
  'PolygonTool',
  'PushTool',
  'PushToolOptions',
  'RectangleTool',
  'SamPredictFn',
  'SamPredictInput',
  'SamPredictOutput',
  'SamRemotePredictInput',
  'SamRemotePredictOutput',
  'SamTool',
  'SamToolOptions',
  'SplitTool',
  'ToolHandler',
  'ToolHandlerOptions',
  'ToolType',
]);

const LOADER_EXPORTS = new Set([
  'DecodedInstance',
  'DecodedInstanceRegion',
  'DecodedPixelSource',
  'ExtractedContour',
  'H5CoordinateLoaderOptions',
  'H5MaskLoaderOptions',
  'InstanceMaskLoaderOptions',
  'MaskLoaderOptions',
  'RgbaPixel',
  'annotationToPgm',
  'annotationsToJSON',
  'annotationsToPgm',
  'decodeInstancePixels',
  'decodeRgb16Pixel',
  'exportMasksToPng',
  'loadH5Coordinates',
  'loadH5Masks',
  'loadInstanceMask',
  'loadJSONFile',
  'loadMaskPolygons',
  'loadPgmFile',
  'loadPgmPolygons',
  'parseJSON',
]);

const DEFAULT_EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.astro',
  'dist',
  'node_modules',
]);

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function extractFences(source) {
  const fences = [];
  const pattern = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;
  for (const match of source.matchAll(pattern)) {
    const contentOffset = match.index + match[0].indexOf('\n') + 1;
    fences.push({
      content: match[2],
      line: lineAt(source, contentOffset),
    });
  }
  return fences;
}

function namedImports(clause) {
  const opening = clause.indexOf('{');
  const closing = clause.lastIndexOf('}');
  if (opening === -1 || closing === -1 || closing <= opening) return [];
  return clause
    .slice(opening + 1, closing)
    .split(',')
    .map(part => part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim())
    .filter(Boolean);
}

function checkSpecifier(specifier, names, location, violations) {
  if (specifier !== 'annota' && !specifier.startsWith('annota/')) return;

  if (!ALLOWED_ANNOTA_IMPORTS.has(specifier)) {
    violations.push({
      ...location,
      message: `non-canonical package entry "${specifier}"`,
    });
    return;
  }

  if (specifier !== 'annota') return;

  for (const name of names) {
    let canonical;
    if (REACT_EXPORTS.has(name)) canonical = 'annota/react';
    else if (TOOL_EXPORTS.has(name)) canonical = 'annota/tools';
    else if (LOADER_EXPORTS.has(name)) canonical = 'annota/loaders';
    if (canonical) {
      violations.push({
        ...location,
        message: `"${name}" must be imported from "${canonical}", not "annota"`,
      });
    }
  }
}

function inspectFence(file, fence, violations) {
  const declarations = /\bimport\s+(?:type\s+)?([\s\S]*?)\s+from\s*(['"])(annota(?:\/[^'"]*)?)\2/g;
  for (const match of fence.content.matchAll(declarations)) {
    checkSpecifier(
      match[3],
      namedImports(match[1]),
      { file, line: fence.line + lineAt(fence.content, match.index) - 1 },
      violations
    );
  }

  const sideEffects = /\bimport\s*(['"])(annota(?:\/[^'"]*)?)\1/g;
  for (const match of fence.content.matchAll(sideEffects)) {
    checkSpecifier(
      match[2],
      [],
      { file, line: fence.line + lineAt(fence.content, match.index) - 1 },
      violations
    );
  }

  const requires = /\b(?:const|let|var)\s+(\{[\s\S]*?\})\s*=\s*require\(\s*(['"])(annota(?:\/[^'"]*)?)\2\s*\)/g;
  for (const match of fence.content.matchAll(requires)) {
    checkSpecifier(
      match[3],
      namedImports(match[1]),
      { file, line: fence.line + lineAt(fence.content, match.index) - 1 },
      violations
    );
  }

  const dynamicImports = /\bimport\(\s*(['"])(annota(?:\/[^'"]*)?)\1\s*\)/g;
  for (const match of fence.content.matchAll(dynamicImports)) {
    checkSpecifier(
      match[2],
      [],
      { file, line: fence.line + lineAt(fence.content, match.index) - 1 },
      violations
    );
  }
}

async function collectMarkdownFiles(target, files, isExplicitTarget) {
  const info = await stat(target);
  if (info.isFile()) {
    if (/\.(?:md|mdx)$/i.test(target)) files.push(target);
    return;
  }

  for (const entry of await readdir(target, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      (
        DEFAULT_EXCLUDED_DIRECTORIES.has(entry.name) ||
        (!isExplicitTarget && entry.name === 'fixtures' && path.basename(target) === 'test')
      )
    ) {
      continue;
    }
    await collectMarkdownFiles(path.join(target, entry.name), files, isExplicitTarget);
  }
}

const args = process.argv.slice(2);
const explicitTargets = args.length > 0;
const targets = explicitTargets ? args : [process.cwd()];
const files = [];

for (const target of targets) {
  await collectMarkdownFiles(path.resolve(target), files, explicitTargets);
}

const violations = [];
for (const file of files.sort()) {
  const source = await readFile(file, 'utf8');
  for (const fence of extractFences(source)) {
    inspectFence(path.relative(process.cwd(), file) || file, fence, violations);
  }
}

if (violations.length > 0) {
  console.error('Non-canonical Annota imports found in Markdown code examples:');
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} Markdown files: all fenced imports are canonical.`);
}
