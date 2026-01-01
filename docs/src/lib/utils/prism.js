// Lazy load Prism to avoid SSR issues
/** @type {any} */
let Prism = null;

async function loadPrism() {
  if (typeof window === 'undefined' || Prism) return;
  
  const prismModule = await import('prismjs');
  Prism = prismModule.default;
  // @ts-ignore - Prism components don't have type definitions
  await import('prismjs/components/prism-typescript');
  // @ts-ignore
  await import('prismjs/components/prism-javascript');
  // @ts-ignore
  await import('prismjs/components/prism-jsx');
  // @ts-ignore
  await import('prismjs/components/prism-tsx');
  // @ts-ignore
  await import('prismjs/components/prism-bash');
  // @ts-ignore
  await import('prismjs/components/prism-json');
  // @ts-ignore
  await import('prismjs/components/prism-css');
  // @ts-ignore
  await import('prismjs/components/prism-markdown');
}

// Load Prism on client side
if (typeof window !== 'undefined') {
  loadPrism();
}

// Prism theme - using a dark theme similar to VS Code
const theme = `
/* PrismJS theme for code blocks */
pre[class*="language-"],
code[class*="language-"] {
  color: #d4d4d4;
  background: #1e1e1e;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  direction: ltr;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  tab-size: 4;
  hyphens: none;
}

pre[class*="language-"] {
  padding: 1em;
  margin: 0.5em 0;
  overflow: auto;
  border-radius: 0.5em;
}

code[class*="language-"] {
  padding: 0.1em 0.3em;
  border-radius: 0.3em;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #6a9955;
}

.token.punctuation {
  color: #d4d4d4;
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
  color: #b5cea8;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #ce9178;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: #d4d4d4;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: #569cd6;
}

.token.function,
.token.class-name {
  color: #dcdcaa;
}

.token.regex,
.token.important,
.token.variable {
  color: #d16969;
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}
`;

// Inject theme into document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = theme;
  document.head.appendChild(style);
}

/**
 * Escapes HTML entities in a string to prevent MDX from parsing them
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * @param {string} code
 * @param {string} lang
 * @returns {Promise<string>}
 */
export async function highlight(code, lang) {
  // Always escape HTML entities first to prevent MDX from parsing code content
  // This is critical for code blocks containing <script> tags or other HTML-like syntax
  const escapedCode = escapeHtml(code);
  
  await loadPrism();
  
  if (typeof window === 'undefined' || !Prism) {
    // SSR fallback: return escaped code
    return escapedCode;
  }

  if (!lang) {
    lang = 'text';
  }

  // Map common language aliases
  /** @type {Record<string, string>} */
  const langMap = {
    'ts': 'typescript',
    'js': 'javascript',
    'sh': 'bash',
    'shell': 'bash',
    'svelte': 'typescript', // Treat Svelte as TypeScript for highlighting
    'tsx': 'tsx',
    'jsx': 'jsx',
  };

  const prismLang = langMap[lang] || lang;

  try {
    if (Prism.languages[prismLang]) {
      // Prism.highlight expects unescaped code, but we've already escaped it
      // So we need to unescape it first, then Prism will escape it again with syntax highlighting
      // Actually, Prism expects raw code - it handles escaping internally
      // But since MDX parses before the highlighter, we need to work with escaped code
      // For now, return escaped code without Prism highlighting to ensure MDX doesn't parse it
      // TODO: Find a way to use Prism while preventing MDX parsing
      return escapedCode;
    }
  } catch (e) {
    console.warn(`Failed to highlight code with language "${lang}":`, e);
  }

  // Fallback: return escaped code
  return escapedCode;
}

