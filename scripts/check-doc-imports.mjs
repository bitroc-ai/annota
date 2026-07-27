import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const PUBLIC_ENTRY_SOURCES = new Map([
  ['annota', 'src/index.ts'],
  ['annota/react', 'src/react-entry.ts'],
  ['annota/svelte', 'src/svelte/index.ts'],
  ['annota/tools', 'src/tools-entry.ts'],
  ['annota/loaders', 'src/loaders-entry.ts'],
]);
const STYLE_ENTRY = 'annota/styles.css';
const LEGACY_FENCE_MARKER = 'annota-legacy-imports';
const DEFAULT_EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.astro',
  'dist',
  'node_modules',
]);

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function resolveSourceModule(fromFile, specifier) {
  if (!specifier.startsWith('.')) return undefined;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  throw new Error(`Cannot resolve exported source module "${specifier}" from ${fromFile}`);
}

function addBindingNames(name, names) {
  if (ts.isIdentifier(name)) {
    names.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) addBindingNames(element.name, names);
  }
}

function hasModifier(node, kind) {
  return ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(modifier => modifier.kind === kind);
}

async function collectModuleExports(file, recursionStack = new Set()) {
  const absoluteFile = path.resolve(file);
  if (recursionStack.has(absoluteFile)) {
    return { hasDefault: false, named: new Set() };
  }

  const nextStack = new Set(recursionStack);
  nextStack.add(absoluteFile);
  const source = await readFile(absoluteFile, 'utf8');
  const sourceFile = ts.createSourceFile(
    absoluteFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    absoluteFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const contract = { hasDefault: false, named: new Set() };

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      contract.hasDefault = true;
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause) {
        if (ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            if (element.name.text === 'default') contract.hasDefault = true;
            else contract.named.add(element.name.text);
          }
        } else {
          contract.named.add(statement.exportClause.name.text);
        }
      } else if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const exportedFile = await resolveSourceModule(absoluteFile, statement.moduleSpecifier.text);
        if (exportedFile) {
          const exported = await collectModuleExports(exportedFile, nextStack);
          for (const name of exported.named) contract.named.add(name);
        }
      }
      continue;
    }

    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
    if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      contract.hasDefault = true;
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        addBindingNames(declaration.name, contract.named);
      }
    } else if ('name' in statement && statement.name && ts.isIdentifier(statement.name)) {
      contract.named.add(statement.name.text);
    }
  }

  return contract;
}

async function buildExportContracts() {
  const contracts = new Map();
  for (const [specifier, sourceFile] of PUBLIC_ENTRY_SOURCES) {
    contracts.set(
      specifier,
      await collectModuleExports(path.resolve(process.cwd(), sourceFile))
    );
  }
  contracts.set(STYLE_ENTRY, { hasDefault: false, named: new Set() });
  return contracts;
}

const EXPORT_CONTRACTS = await buildExportContracts();

function extractFences(source) {
  const fences = [];
  const lines = source.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].match(/^( {0,3})(`{3,}|~{3,})([^\r]*)\r?$/);
    if (!opening) continue;

    const marker = opening[2][0];
    if (marker === '`' && opening[3].includes('`')) continue;

    const minimumClosingLength = opening[2].length;
    const closingPattern = new RegExp(
      `^ {0,3}${marker === '`' ? '`' : '~'}{${minimumClosingLength},}[ \\t]*\\r?$`
    );
    let closingIndex = index + 1;
    while (closingIndex < lines.length && !closingPattern.test(lines[closingIndex])) {
      closingIndex += 1;
    }

    const infoTokens = opening[3].trim().split(/\s+/).filter(Boolean);
    fences.push({
      allowLegacyImports: infoTokens.includes(LEGACY_FENCE_MARKER),
      content: lines.slice(index + 1, Math.min(closingIndex, lines.length)).join('\n'),
      line: index + 2,
    });
    index = closingIndex < lines.length ? closingIndex : lines.length;
  }

  return fences;
}

function astroBodyOffset(source) {
  if (!source.startsWith('---')) return 0;
  const closing = /^---[ \t]*\r?$/gm;
  closing.lastIndex = source.indexOf('\n') + 1;
  const match = closing.exec(source);
  return match ? match.index + match[0].length : 0;
}

function astroCommentRanges(source, bodyOffset) {
  const ranges = [];
  let braceDepth = 0;
  let escaped = false;
  let inTag = false;
  let quote;

  for (let index = bodyOffset; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    const htmlComment = !inTag && braceDepth === 0 && source.startsWith('<!--', index);
    const astroComment = source.startsWith('{/*', index);
    if (htmlComment || astroComment) {
      const closingToken = htmlComment ? '-->' : '*/}';
      const closingIndex = source.indexOf(
        closingToken,
        index + (htmlComment ? '<!--'.length : '{/*'.length)
      );
      const end = closingIndex === -1
        ? source.length
        : closingIndex + closingToken.length;
      ranges.push({
        end,
        start: index,
      });
      index = end - 1;
      continue;
    }

    if ((inTag || braceDepth > 0) && (character === '\'' || character === '"' || character === '`')) {
      quote = character;
    } else if (character === '{') {
      braceDepth += 1;
    } else if (character === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
    } else if (character === '<' && braceDepth === 0) {
      inTag = true;
    } else if (character === '>' && braceDepth === 0) {
      inTag = false;
    }
  }

  return ranges;
}

function containingRange(offset, ranges) {
  return ranges.find(range => offset >= range.start && offset < range.end);
}

function findAstroOpeningTagEnd(source, start) {
  let quote;
  let escaped = false;
  let braceDepth = 0;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === '\'' || character === '"' || character === '`') {
      quote = character;
    } else if (character === '{') {
      braceDepth += 1;
    } else if (character === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
    } else if (character === '>' && braceDepth === 0) {
      return index;
    }
  }

  return -1;
}

function parseStaticStringLiteral(literal) {
  const sourceFile = ts.createSourceFile(
    'astro-code-attribute.ts',
    `const displayedCode = ${literal};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const declaration = sourceFile.statements[0]?.declarationList?.declarations?.[0];
  const initializer = declaration?.initializer;
  return initializer && ts.isStringLiteralLike(initializer) ? initializer.text : undefined;
}

function extractAstroCodeExamples(source) {
  const examples = [];
  const componentPattern = /<Code(?=[\s/>])/g;
  const bodyOffset = astroBodyOffset(source);
  const commentRanges = astroCommentRanges(source, bodyOffset);
  componentPattern.lastIndex = bodyOffset;

  let component;
  while ((component = componentPattern.exec(source)) !== null) {
    const tagStart = component.index;
    const commentRange = containingRange(tagStart, commentRanges);
    if (commentRange) {
      componentPattern.lastIndex = commentRange.end;
      continue;
    }

    const tagEnd = findAstroOpeningTagEnd(source, tagStart + component[0].length);
    if (tagEnd === -1) continue;

    const openingTag = source.slice(tagStart, tagEnd + 1);
    const codeAttribute = /(?:^|\s)code\s*=\s*\{\s*/.exec(openingTag);
    if (!codeAttribute) continue;

    const literalStart = codeAttribute.index + codeAttribute[0].length;
    const quote = openingTag[literalStart];
    if (quote !== '\'' && quote !== '"' && quote !== '`') continue;

    let escaped = false;
    let literalEnd = -1;
    for (let index = literalStart + 1; index < openingTag.length; index += 1) {
      const character = openingTag[index];
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        literalEnd = index;
        break;
      }
    }
    if (literalEnd === -1) continue;

    const literal = openingTag.slice(literalStart, literalEnd + 1);
    const content = parseStaticStringLiteral(literal);
    if (content === undefined) continue;

    examples.push({
      allowLegacyImports: false,
      content,
      line: lineAt(source, tagStart + literalStart + 1),
    });
    componentPattern.lastIndex = tagEnd + 1;
  }

  return examples;
}

function isAnnotaSpecifier(specifier) {
  return specifier === 'annota' || specifier.startsWith('annota/');
}

function canonicalRootEntry(name) {
  const root = EXPORT_CONTRACTS.get('annota');
  if (EXPORT_CONTRACTS.get('annota/react').named.has(name)) return 'annota/react';
  if (EXPORT_CONTRACTS.get('annota/tools').named.has(name)) return 'annota/tools';
  if (EXPORT_CONTRACTS.get('annota/loaders').named.has(name)) return 'annota/loaders';
  if (!root.named.has(name) && EXPORT_CONTRACTS.get('annota/svelte').named.has(name)) {
    return 'annota/svelte';
  }
  return undefined;
}

function checkSpecifier(specifier, request, location, violations) {
  if (!isAnnotaSpecifier(specifier)) return;

  const contract = EXPORT_CONTRACTS.get(specifier);
  if (!contract) {
    violations.push({
      ...location,
      message: `non-canonical package entry "${specifier}"`,
    });
    return;
  }

  if (request.hasDefault && !contract.hasDefault) {
    violations.push({
      ...location,
      message: `default export is not available from "${specifier}"`,
    });
  }
  if (request.hasNamespace && contract.named.size === 0 && !contract.hasDefault) {
    violations.push({
      ...location,
      message: `namespace import is not available from "${specifier}"`,
    });
  }

  for (const name of request.names) {
    if (name === 'default') {
      if (!contract.hasDefault && !request.hasDefault) {
        violations.push({
          ...location,
          message: `default export is not available from "${specifier}"`,
        });
      }
      continue;
    }

    if (specifier === 'annota') {
      const canonical = canonicalRootEntry(name);
      if (canonical) {
        violations.push({
          ...location,
          message: `"${name}" must be imported from "${canonical}", not "annota"`,
        });
      } else if (!contract.named.has(name)) {
        violations.push({
          ...location,
          message: `"${name}" is not exported by "annota"`,
        });
      }
    } else if (!contract.named.has(name)) {
      violations.push({
        ...location,
        message: `"${name}" is not exported by "${specifier}"`,
      });
    }
  }
}

function scriptRegions(example) {
  const regions = [];
  const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of example.content.matchAll(scriptPattern)) {
    const contentOffset = match.index + match[0].indexOf(match[1]);
    regions.push({
      content: match[1],
      line: example.line + lineAt(example.content, contentOffset) - 1,
    });
  }
  return regions.length > 0 ? regions : [{ content: example.content, line: example.line }];
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    current &&
    (
      ts.isAwaitExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression(current)
    )
  ) {
    current = current.expression;
  }
  return current;
}

function moduleCallSpecifier(expression, callName) {
  const unwrapped = unwrapExpression(expression);
  if (
    !unwrapped ||
    !ts.isCallExpression(unwrapped) ||
    unwrapped.arguments.length !== 1 ||
    !ts.isStringLiteralLike(unwrapped.arguments[0])
  ) {
    return undefined;
  }
  if (callName === 'import' && unwrapped.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return unwrapped.arguments[0].text;
  }
  if (callName === 'require' && ts.isIdentifier(unwrapped.expression) && unwrapped.expression.text === 'require') {
    return unwrapped.arguments[0].text;
  }
  return undefined;
}

function staticPropertyName(name) {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  if (
    ts.isComputedPropertyName(name) &&
    ts.isStringLiteralLike(unwrapExpression(name.expression))
  ) {
    return unwrapExpression(name.expression).text;
  }
  return undefined;
}

function objectBindingNames(pattern) {
  const names = [];
  for (const element of pattern.elements) {
    if (element.dotDotDotToken) continue;
    const name = element.propertyName
      ? staticPropertyName(element.propertyName)
      : ts.isIdentifier(element.name)
        ? element.name.text
        : undefined;
    if (name !== undefined) names.push(name);
  }
  return names;
}

function objectAssignmentNames(pattern) {
  const names = [];
  for (const property of pattern.properties) {
    if (ts.isSpreadAssignment(property)) continue;
    if (ts.isShorthandPropertyAssignment(property)) {
      names.push(property.name.text);
      continue;
    }
    if (ts.isPropertyAssignment(property)) {
      const name = staticPropertyName(property.name);
      if (name !== undefined) names.push(name);
    }
  }
  return names;
}

let snippetSequence = 0;

function createSnippetProgram(file, content) {
  const virtualFile = path.resolve(
    process.cwd(),
    `.annota-documentation-example-${snippetSequence += 1}-${path.basename(file)}.tsx`
  );
  const options = {
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const sourceFile = ts.createSourceFile(
    virtualFile,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const host = {
    fileExists: candidate => candidate === virtualFile,
    getCanonicalFileName: candidate => candidate,
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: () => 'lib.d.ts',
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: candidate => candidate === virtualFile ? sourceFile : undefined,
    readFile: candidate => candidate === virtualFile ? content : undefined,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };
  const program = ts.createProgram({
    rootNames: [virtualFile],
    options,
    host,
  });
  return {
    checker: program.getTypeChecker(),
    sourceFile: program.getSourceFile(virtualFile),
  };
}

function directModuleSpecifier(expression) {
  return moduleCallSpecifier(expression, 'import') ?? moduleCallSpecifier(expression, 'require');
}

function symbolForIdentifier(checker, identifier) {
  return ts.isIdentifier(identifier) ? checker.getSymbolAtLocation(identifier) : undefined;
}

function namespaceFromExpression(expression, checker, namespaceSymbols) {
  const unwrapped = unwrapExpression(expression);
  if (!unwrapped) return undefined;

  const direct = directModuleSpecifier(unwrapped);
  if (direct) return direct;

  if (ts.isIdentifier(unwrapped)) {
    const symbol = symbolForIdentifier(checker, unwrapped);
    return symbol && namespaceSymbols.get(symbol);
  }

  if (
    ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    return namespaceFromExpression(unwrapped.right, checker, namespaceSymbols);
  }

  return undefined;
}

function namespaceRequest(names) {
  return {
    hasDefault: names.includes('default'),
    hasNamespace: false,
    names: names.filter(name => name !== 'default'),
  };
}

function inspectRegion(file, region, violations) {
  const analysis = createSnippetProgram(file, region.content);
  const { checker, sourceFile } = analysis;
  const namespaceSymbols = new Map();

  const locationFor = node => ({
    file,
    line: region.line + sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line,
  });

  const seedImports = node => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const request = { hasDefault: false, hasNamespace: false, names: [] };
      const clause = node.importClause;
      if (clause) {
        request.hasDefault = Boolean(clause.name);
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            request.names.push((element.propertyName ?? element.name).text);
          }
        } else if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          request.hasNamespace = true;
          const symbol = symbolForIdentifier(checker, clause.namedBindings.name);
          if (symbol) namespaceSymbols.set(symbol, specifier);
        }
      }
      checkSpecifier(specifier, request, locationFor(node), violations);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      const specifier = node.moduleReference.expression.text;
      const symbol = symbolForIdentifier(checker, node.name);
      if (symbol) namespaceSymbols.set(symbol, specifier);
      checkSpecifier(
        specifier,
        { hasDefault: false, hasNamespace: true, names: [] },
        locationFor(node),
        violations
      );
    }
    ts.forEachChild(node, seedImports);
  };
  seedImports(sourceFile);

  let changed = true;
  while (changed) {
    changed = false;
    const propagateAliases = node => {
      let identifier;
      let expression;
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer
      ) {
        identifier = node.name;
        expression = node.initializer;
      } else if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left)
      ) {
        identifier = node.left;
        expression = node.right;
      }

      if (identifier && expression) {
        const specifier = namespaceFromExpression(expression, checker, namespaceSymbols);
        const symbol = symbolForIdentifier(checker, identifier);
        if (specifier && symbol && !namespaceSymbols.has(symbol)) {
          namespaceSymbols.set(symbol, specifier);
          changed = true;
        }
      }
      ts.forEachChild(node, propagateAliases);
    };
    propagateAliases(sourceFile);
  }

  const checkNamespaceNames = (specifier, names, node) => {
    if (!specifier || names.length === 0) return;
    checkSpecifier(specifier, namespaceRequest(names), locationFor(node), violations);
  };

  const inspectUsage = node => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const specifier = namespaceFromExpression(node.initializer, checker, namespaceSymbols);
      if (specifier && ts.isObjectBindingPattern(node.name)) {
        checkNamespaceNames(specifier, objectBindingNames(node.name), node);
      } else if (
        specifier &&
        ts.isIdentifier(node.name) &&
        directModuleSpecifier(node.initializer)
      ) {
        checkSpecifier(
          specifier,
          { hasDefault: false, hasNamespace: true, names: [] },
          locationFor(node),
          violations
        );
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const specifier = namespaceFromExpression(node.right, checker, namespaceSymbols);
      const left = unwrapExpression(node.left);
      if (specifier && left && ts.isObjectLiteralExpression(left)) {
        checkNamespaceNames(specifier, objectAssignmentNames(left), node);
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      const specifier = namespaceFromExpression(node.expression, checker, namespaceSymbols);
      checkNamespaceNames(specifier, [node.name.text], node);
    } else if (ts.isElementAccessExpression(node)) {
      const specifier = namespaceFromExpression(node.expression, checker, namespaceSymbols);
      const argument = node.argumentExpression && unwrapExpression(node.argumentExpression);
      if (specifier && argument && ts.isStringLiteralLike(argument)) {
        checkNamespaceNames(specifier, [argument.text], node);
      }
    } else if (ts.isQualifiedName(node)) {
      const specifier = ts.isIdentifier(node.left)
        ? namespaceFromExpression(node.left, checker, namespaceSymbols)
        : undefined;
      checkNamespaceNames(specifier, [node.right.text], node);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      const specifier = directModuleSpecifier(node);
      if (specifier) {
        checkSpecifier(
          specifier,
          { hasDefault: false, hasNamespace: false, names: [] },
          locationFor(node),
          violations
        );
      }
    }
    ts.forEachChild(node, inspectUsage);
  };
  inspectUsage(sourceFile);
}

function inspectExample(file, example, violations) {
  if (example.allowLegacyImports) return;
  for (const region of scriptRegions(example)) {
    inspectRegion(file, region, violations);
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
  for (const example of examples) {
    inspectExample(path.relative(process.cwd(), file) || file, example, violations);
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
