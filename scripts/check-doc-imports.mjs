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
  componentPattern.lastIndex = astroBodyOffset(source);

  let component;
  while ((component = componentPattern.exec(source)) !== null) {
    const tagStart = component.index;
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
      ts.isTypeAssertionExpression(current)
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

function modulePropertyRequest(expression) {
  const unwrapped = unwrapExpression(expression);
  let moduleExpression;
  let exportedName;
  if (unwrapped && ts.isPropertyAccessExpression(unwrapped)) {
    moduleExpression = unwrapped.expression;
    exportedName = unwrapped.name.text;
  } else if (
    unwrapped &&
    ts.isElementAccessExpression(unwrapped) &&
    unwrapped.argumentExpression &&
    ts.isStringLiteralLike(unwrapped.argumentExpression)
  ) {
    moduleExpression = unwrapped.expression;
    exportedName = unwrapped.argumentExpression.text;
  }
  if (!moduleExpression || !exportedName) return undefined;

  const specifier = moduleCallSpecifier(moduleExpression, 'import') ??
    moduleCallSpecifier(moduleExpression, 'require');
  if (!specifier) return undefined;
  return {
    request: {
      hasDefault: exportedName === 'default',
      hasNamespace: false,
      names: exportedName === 'default' ? [] : [exportedName],
    },
    specifier,
  };
}

function bindingRequest(name) {
  const request = { hasDefault: false, hasNamespace: false, names: [] };
  if (ts.isIdentifier(name)) {
    request.hasNamespace = true;
    return request;
  }
  if (!ts.isObjectBindingPattern(name)) return request;
  for (const element of name.elements) {
    if (element.dotDotDotToken) continue;
    const imported = element.propertyName && ts.isIdentifier(element.propertyName)
      ? element.propertyName.text
      : ts.isIdentifier(element.name)
        ? element.name.text
        : undefined;
    if (imported === 'default') request.hasDefault = true;
    else if (imported) request.names.push(imported);
  }
  return request;
}

function inspectRegion(file, region, violations) {
  const sourceFile = ts.createSourceFile(
    `${file}.tsx`,
    region.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const namespaces = new Map();

  const locationFor = node => ({
    file,
    line: region.line + sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line,
  });

  const firstPass = node => {
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
          namespaces.set(clause.namedBindings.name.text, specifier);
        }
      }
      checkSpecifier(specifier, request, locationFor(node), violations);
    } else if (ts.isVariableDeclaration(node) && node.initializer) {
      const dynamicSpecifier = moduleCallSpecifier(node.initializer, 'import');
      const requireSpecifier = moduleCallSpecifier(node.initializer, 'require');
      const specifier = dynamicSpecifier ?? requireSpecifier;
      if (specifier) {
        const request = bindingRequest(node.name);
        if (request.hasNamespace && ts.isIdentifier(node.name)) {
          namespaces.set(node.name.text, specifier);
        }
        checkSpecifier(specifier, request, locationFor(node), violations);
      } else {
        const propertyRequest = modulePropertyRequest(node.initializer);
        if (propertyRequest) {
          checkSpecifier(
            propertyRequest.specifier,
            propertyRequest.request,
            locationFor(node),
            violations
          );
        }
      }
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      const specifier = moduleCallSpecifier(node, 'import') ?? moduleCallSpecifier(node, 'require');
      if (specifier) {
        checkSpecifier(
          specifier,
          { hasDefault: false, hasNamespace: false, names: [] },
          locationFor(node),
          violations
        );
      }
    }
    ts.forEachChild(node, firstPass);
  };
  firstPass(sourceFile);

  const secondPass = node => {
    let namespace;
    let exportedName;
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression)
    ) {
      namespace = node.expression.text;
      exportedName = node.name.text;
    } else if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      namespace = node.expression.text;
      exportedName = node.argumentExpression.text;
    }

    const specifier = namespace && namespaces.get(namespace);
    if (specifier && exportedName) {
      checkSpecifier(
        specifier,
        { hasDefault: false, hasNamespace: false, names: [exportedName] },
        locationFor(node),
        violations
      );
    }
    ts.forEachChild(node, secondPass);
  };
  secondPass(sourceFile);
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
