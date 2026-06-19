import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import { remarkWikilinks } from './src/lib/remark-wikilinks.mjs';

// Collect existing wiki page ids so [[wikilinks]] can flag unknown targets.
const WIKI_DIR = fileURLToPath(new URL('./src/content/wiki/', import.meta.url));
function collectIds(dir, base = dir) {
  const ids = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) ids.push(...collectIds(full, base));
    else if (/\.(md|mdx)$/.test(entry.name))
      ids.push(relative(base, full).replace(/\.(md|mdx)$/, '').split(sep).join('/'));
  }
  return ids;
}
const validIds = new Set(collectIds(WIKI_DIR));

// Site URL — override with SITE env var if needed.
const SITE = process.env.SITE ?? 'https://nkapw.github.io';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  server: { host: '0.0.0.0' },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap(),
  ],
  vite: {
    build: { rollupOptions: { external: ['/pagefind/pagefind.js'] } },
  },
  markdown: {
    remarkPlugins: [[remarkWikilinks, { validIds }]],
    shikiConfig: { theme: 'github-light' },
  },
});
