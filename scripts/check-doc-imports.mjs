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

const SVELTE_EXPORTS = new Set([
  'AnnotaProvider',
  'Annotation',
  'AnnotationEditor',
  'AnnotationStyle',
  'Annotator',
  'ContextMenu',
  'ContextMenuDivider',
  'ContextMenuItem',
  'Popup',
  'Shape',
  'ShapeType',
  'Viewer',
  'annotations',
  'contextMenu',
  'contextMenuBinding',
  'editing',
  'getAnnotator',
  'history',
  'layerManager',
  'layers',
  'pushToolCursor',
  'selection',
  'setAnnotator',
  'tool',
  'viewer',
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

const LEGACY_FENCE_MARKER = 'annota-legacy-imports';
const ROOT_REACT_EXPORTS = new Set([
  ...REACT_EXPORTS,
  'AnnotaViewer',
  'AnnotaViewerProps',
]);
const SVELTE_FRAMEWORK_EXPORTS = new Set(
  [...SVELTE_EXPORTS].filter(name => ![
    'Annotation',
    'AnnotationStyle',
    'Shape',
    'ShapeType',
  ].includes(name))
);
const CANONICAL_ENTRY_EXPORTS = new Map([
  ['annota/react', REACT_EXPORTS],
  ['annota/svelte', SVELTE_EXPORTS],
  ['annota/tools', TOOL_EXPORTS],
  ['annota/loaders', LOADER_EXPORTS],
]);

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function extractFences(source) {
  const fences = [];
  const lines = source.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].match(/^[ \t]*(`{3,}|~{3,})([^\r]*)\r?$/);
    if (!opening) continue;

    const marker = opening[1][0];
    const minimumClosingLength = opening[1].length;
    const closingPattern = new RegExp(
      `^[ \\t]*${marker === '`' ? '`' : '~'}{${minimumClosingLength},}[ \\t]*\\r?$`
    );
    let closingIndex = index + 1;
    while (closingIndex < lines.length && !closingPattern.test(lines[closingIndex])) {
      closingIndex += 1;
    }

    const infoTokens = opening[2].trim().split(/\s+/).filter(Boolean);
    const contentEnd = Math.min(closingIndex, lines.length);
    fences.push({
      allowLegacyImports: infoTokens.includes(LEGACY_FENCE_MARKER),
      content: lines.slice(index + 1, contentEnd).join('\n'),
      line: index + 2,
    });

    index = closingIndex < lines.length ? closingIndex : lines.length;
  }

  return fences;
}

function extractAstroCodeExamples(source) {
  const examples = [];
  const pattern = /<Code\b[\s\S]*?\bcode=\{`([\s\S]*?)`\}[\s\S]*?\/>/g;
  for (const match of source.matchAll(pattern)) {
    const contentOffset = match.index + match[0].indexOf('code={`') + 'code={`'.length;
    examples.push({
      allowLegacyImports: false,
      content: match[1],
      line: lineAt(source, contentOffset),
    });
  }
  return examples;
}

function namedImports(clause) {
  const opening = clause.indexOf('{');
  const closing = clause.lastIndexOf('}');
  if (opening === -1 || closing === -1 || closing <= opening) return [];
  return clause
    .slice(opening + 1, closing)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
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

  if (specifier === 'annota') {
    for (const name of names) {
      let canonical;
      if (ROOT_REACT_EXPORTS.has(name)) canonical = 'annota/react';
      else if (SVELTE_FRAMEWORK_EXPORTS.has(name)) canonical = 'annota/svelte';
      else if (TOOL_EXPORTS.has(name)) canonical = 'annota/tools';
      else if (LOADER_EXPORTS.has(name)) canonical = 'annota/loaders';
      if (!canonical) continue;

      violations.push({
        ...location,
        message: `"${name}" must be imported from "${canonical}", not "annota"`,
      });
    }
    return;
  }

  const entryExports = CANONICAL_ENTRY_EXPORTS.get(specifier);
  if (!entryExports) return;
  for (const name of names) {
    if (entryExports.has(name)) continue;
    violations.push({
      ...location,
      message: `"${name}" is not exported by "${specifier}"`,
    });
  }
}

function inspectFence(file, fence, violations) {
  if (fence.allowLegacyImports) return;

  const declarations = /\bimport\s+(?:type\s+)?([\s\S]*?)\s+from\s*(['"])([^'"]+)\2/g;
  for (const match of fence.content.matchAll(declarations)) {
    if (match[3] !== 'annota' && !match[3].startsWith('annota/')) continue;
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

async function collectDocumentationFiles(target, files, isExplicitTarget) {
  const info = await stat(target);
  if (info.isFile()) {
    if (/\.(?:astro|md|mdx)$/i.test(target)) files.push(target);
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
    await collectDocumentationFiles(path.join(target, entry.name), files, isExplicitTarget);
  }
}

const args = process.argv.slice(2);
const explicitTargets = args.length > 0;
const targets = explicitTargets ? args : [process.cwd()];
const files = [];

for (const target of targets) {
  await collectDocumentationFiles(path.resolve(target), files, explicitTargets);
}

const violations = [];
for (const file of files.sort()) {
  const source = await readFile(file, 'utf8');
  const examples = path.extname(file).toLowerCase() === '.astro'
    ? extractAstroCodeExamples(source)
    : extractFences(source);
  for (const fence of examples) {
    inspectFence(path.relative(process.cwd(), file) || file, fence, violations);
  }
}

if (violations.length > 0) {
  console.error('Invalid Annota imports found in user-facing documentation examples:');
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} documentation files: all user examples use canonical imports.`);
}
