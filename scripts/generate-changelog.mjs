import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const version = argument('--version');
const file = argument('--file') ?? 'docs/src/content/docs/changelog.mdx';
const releaseDate = argument('--date') ?? new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
}).format(new Date());

if (!version) {
  throw new Error('Missing required --version argument');
}

const changes = (await new Promise((resolve, reject) => {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    input += chunk;
  });
  process.stdin.on('end', () => resolve(input.trim()));
  process.stdin.on('error', reject);
})) || '- No package changes recorded.';

const existing = await readFile(file, 'utf8');
const frontmatter = existing.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)?.[0];
if (!frontmatter) {
  throw new Error(`Changelog ${file} is missing valid frontmatter`);
}

const versionHeadings = [...existing.matchAll(/^## v([^\r\n]+)\r?$/gm)];
const previousVersions = versionHeadings
  .map((heading, index) => ({
    version: heading[1].trim(),
    content: existing.slice(
      heading.index,
      versionHeadings[index + 1]?.index ?? existing.length
    ).trimEnd(),
  }))
  .filter(section => section.version !== version)
  .map(section => section.content)
  .join('\n\n');
const next = `${frontmatter}
# Changelog

All notable changes to Annota are documented here.

## v${version}

Released on ${releaseDate}

### Changes

${changes}

### Installation

\`\`\`bash
npm install annota@${version}
# or
pnpm add annota@${version}
\`\`\`

---

${previousVersions}`.trimEnd();

await writeFile(file, `${next}\n`);
