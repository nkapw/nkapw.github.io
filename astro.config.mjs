import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
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

// https://astro.build/config
export default defineConfig({
  site: 'http://100.115.222.78:4321',
  server: { host: '0.0.0.0' },
  integrations: [
    // applyBaseStyles: false so Tailwind's Preflight reset does NOT strip
    // the browser's default styling (link colors, heading sizes, list markers).
    // We want raw browser defaults — Tailwind is layout-only here.
    tailwind({ applyBaseStyles: false }),
    mdx(),
  ],
  vite: {
    // pagefind's bundle is generated after the Astro build and served as a
    // static file — it must not be resolved by Vite at build time.
    build: { rollupOptions: { external: ['/pagefind/pagefind.js'] } },
  },
  markdown: {
    remarkPlugins: [[remarkWikilinks, { validIds }]],
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
