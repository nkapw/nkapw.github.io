#!/usr/bin/env node
/*
 * check-links.mjs — build-time wiki integrity check.
 *
 *   - Broken links: any `related:` slug or inline /wiki/<id>/ body link that
 *     points to a page that does not exist. These FAIL the build (exit 1).
 *   - Orphans: pages no other wiki page links to. These only WARN (exit 0),
 *     since an entry point with no inbound links is sometimes intentional.
 *
 * Zero dependencies — frontmatter is parsed with small regexes because the
 * content format is controlled by this repo.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/content/wiki/', import.meta.url));
// The site entry page also links into the wiki; its links count as inbound.
const HOME_PAGE = fileURLToPath(new URL('../src/pages/index.astro', import.meta.url));

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(md|mdx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const toId = (file) =>
  relative(ROOT, file)
    .replace(/\.(md|mdx)$/, '')
    .split(sep)
    .join('/');

const files = await walk(ROOT);
const ids = new Set(files.map(toId));

const pages = [];
for (const file of files) {
  const id = toId(file);
  const raw = await readFile(file, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  const front = fm ? fm[1] : '';
  const body = fm ? raw.slice(fm[0].length) : raw;

  const relMatch = front.match(/related:\s*\[([^\]]*)\]/);
  const related = relMatch
    ? relMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    : [];

  // Strip code spans/blocks so literal [[...]] examples there aren't mistaken
  // for real links (the remark plugin skips them too).
  const scrubbed = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/<code>[\s\S]*?<\/code>/g, '');

  const bodyLinks = [...scrubbed.matchAll(/\/wiki\/([a-z0-9\-/]+)\//g)].map((m) => m[1]);
  const wikiLinks = [...scrubbed.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].split('|')[0].trim());
  const draft = /^draft:\s*true\s*$/m.test(front);

  pages.push({ id, draft, refs: [...new Set([...related, ...bodyLinks, ...wikiLinks])] });
}

// Drafts are not shipped to production, so only published pages are valid link
// targets, and only links *from* published pages can be broken.
const publishedIds = new Set(pages.filter((p) => !p.draft).map((p) => p.id));

const broken = [];
const inbound = new Set();
for (const page of pages) {
  if (page.draft) continue;
  for (const ref of page.refs) {
    if (publishedIds.has(ref)) inbound.add(ref);
    else broken.push({ from: page.id, ref });
  }
}

// Links from the home page count as inbound too (it's a real entry point).
const homeSource = await readFile(HOME_PAGE, 'utf8');
for (const [, ref] of homeSource.matchAll(/\/wiki\/([a-z0-9\-/]+)\//g)) {
  if (publishedIds.has(ref)) inbound.add(ref);
  else broken.push({ from: 'index.astro', ref });
}

const orphans = [...publishedIds].filter((id) => !inbound.has(id)).sort();

const draftCount = pages.length - publishedIds.size;
console.log(
  `check-links: ${publishedIds.size} published pages` +
    (draftCount ? `, ${draftCount} draft(s) skipped` : ''),
);

if (orphans.length > 0) {
  console.warn(`\n  ⚠ ${orphans.length} orphan page(s) (nothing links to them):`);
  for (const id of orphans) console.warn(`    - ${id}`);
}

if (broken.length > 0) {
  console.error(`\n  ✗ ${broken.length} broken link(s):`);
  for (const { from, ref } of broken) console.error(`    - ${from} → /wiki/${ref}/ (missing)`);
  console.error('');
  process.exit(1);
}

console.log('  ✓ no broken links');
