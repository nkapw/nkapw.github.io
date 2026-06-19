# Personal Wiki — Project Rules

## What this is

An AstroJS personal wiki + tutorial site with a raw brutalist aesthetic.
Two sections share one codebase and one layout:

- `/wiki/*` — evergreen notes, linked like a Zettelkasten
- `/tutorial/*` — ordered series → lessons

## Tech stack

- **AstroJS 5** with Content Collections (glob loader)
- **Tailwind CSS v3** — layout utilities only (see Design Rules)
- **Markdown/MDX** for all content
- **Pagefind** — static full-text search (indexes after `npm run build`)
- No UI component libraries. No JS frameworks (React, Vue, etc.).

## Commands

```bash
npm run dev          # dev server on 0.0.0.0:4321
npm run build        # check-links → astro build → pagefind index
npm run check:links  # standalone broken-link + orphan checker
npm run preview      # serve the built dist/
```

## Design rules — READ BEFORE TOUCHING CSS OR MARKUP

The aesthetic is intentionally plain. Before adding any style, ask: "would this
exist on a 1996 website?"

1. **Black `#000` on white `#fff`.** No custom colors anywhere except the
   `prefers-color-scheme: dark` inversion in `global.css`.
2. **Browser defaults are the style.** Links are blue + underlined. Visited
   links are `#551a8b`. Headings scale h1 > h2 > h3 by browser default.
   Do not override these.
3. **Tailwind for layout only.** Allowed: `max-w-*`, `mx-*`, `px-*`, `py-*`,
   `grid`, `flex`, `gap-*`, `lg:` breakpoint prefixes.
   Forbidden: colors, typography, borders, shadows, rounded corners, anything
   decorative.
4. **Tailwind Preflight is disabled.** (`preflight: false` in
   `tailwind.config.mjs`, `applyBaseStyles: false` in `astro.config.mjs`).
   Never re-enable it — it would strip browser defaults for links, lists, and
   headings.
5. **The only CSS file is `src/styles/global.css`.** It declares the system
   font stack, code-block gray background, and the dark-mode inversion.
   Nothing else goes here.
6. **No icons, no images** (unless wiki/tutorial content explicitly requires
   one). No SVG decorations.
7. **No custom button styles.** If you need a button, use `<button>` and let
   the browser render it natively.
8. **Semantic HTML first.** `<nav>`, `<article>`, `<header>`, `<footer>`,
   `<main>`, `<hr>`, `<blockquote>`, `<ol>`, `<ul>`, `<table border="1">`.

The litmus test: remove all Tailwind class attributes. The site must still be
100% readable and navigable.

## File structure

```
src/
├── content/
│   ├── wiki/               # wiki pages (flat or nested folders)
│   │   └── methods/        # sub-folder example → breadcrumb auto-generates
│   └── tutorials/
│       └── <series>/
│           ├── index.md    # series metadata (Astro id: "<series>")
│           └── 01-*.md     # lessons, ordered by filename prefix
├── layouts/
│   └── WikiLayout.astro    # single layout for ALL pages
├── lib/
│   ├── wiki.ts             # getWikiPages, getBacklinks, getTagGroups, slugifyTag, extractBodyRefs
│   ├── tutorial.ts         # getTutorialPages, getAllSeries, getLessons, getSeriesEntry, isIndex, seriesSlug, lessonSlug
│   └── remark-wikilinks.mjs  # [[slug]] and [[slug|label]] → links at build time
├── pages/
│   ├── index.astro         # wiki home (recently updated + filterable list)
│   ├── 404.astro
│   ├── rss.xml.ts
│   ├── search.astro        # Pagefind full-text search
│   ├── tags/
│   │   ├── index.astro
│   │   └── [tag].astro
│   ├── tutorial/
│   │   ├── index.astro
│   │   └── [series]/
│   │       ├── index.astro
│   │       └── [lesson].astro
│   └── wiki/
│       └── [...slug].astro
├── styles/
│   └── global.css
└── content.config.ts       # Zod schemas for wiki + tutorials collections
scripts/
└── check-links.mjs         # build-time link integrity checker
```

## Content rules — wiki

### Frontmatter schema

```yaml
---
title: string           # required
description: string     # optional, shown in listings
tags: [tag1, tag2]      # optional, auto-generates /tags/<slug>/ pages
updated: YYYY-MM-DD     # optional, shown on page and in RSS
related: [slug, folder/slug]  # optional, curated outbound links
draft: true             # optional, hides from prod (visible in dev)
---
```

### Wikilinks

Use `[[slug]]` or `[[slug|label]]` in body text to link to wiki pages.
- `slug` must match the page's content collection id exactly.
- Nested pages: `[[methods/maps-of-content]]`
- Unknown targets render as `text [?]` — the link checker will also catch them.
- Inside `` `code` `` or `<code>` blocks, `[[...]]` is treated as literal text.

### Folder structure → breadcrumbs

Any file at `wiki/methods/topic.md` auto-generates breadcrumb:
`Home / Methods / Topic`

If `wiki/methods/index.md` exists, "Methods" becomes a clickable link.
Folder names are humanized: `maps-of-content` → `Maps Of Content`.

### Backlinks

Computed automatically from `related` frontmatter **and** inline
`/wiki/<id>/` links **and** `[[wikilink]]` syntax. No manual maintenance.

### Orphan pages

The link checker warns about wiki pages with no inbound links. The `index` page
is allowlisted. Fix orphans by linking from another page or from the Overview
(`src/content/wiki/index.md`). Links from `src/pages/index.astro` also count.

## Content rules — tutorials

### Frontmatter schema

```yaml
---
title: string           # required
description: string     # optional
tags: [tag1, tag2]      # optional
order: 1                # integer, controls sort order within series / of series
updated: YYYY-MM-DD     # optional
draft: true             # optional
---
```

### Series structure

- `src/content/tutorials/<series>/index.md` — series metadata. Astro assigns
  id `<series>` (NOT `<series>/index`). Detected via `isIndex(id)` in
  `src/lib/tutorial.ts` which checks `!id.includes('/')`.
- Lessons: `01-title.md`, `02-title.md`, … — filename prefix determines
  alphabetical order as a fallback; use `order:` frontmatter for explicit control.
- Lesson ids look like `<series>/01-title`. `seriesSlug(id)` extracts the
  series part; `lessonSlug(id)` extracts the lesson part.

### ⚠ Known Astro behaviour

Astro's glob loader **strips `/index`** from ids for `index.md` files inside
subfolders. `git-basics/index.md` → id `git-basics` (not `git-basics/index`).
`isIndex()` handles this: `!id.includes('/')`. Do not change this logic.

## Link checker

`scripts/check-links.mjs` runs automatically before every `npm run build`.

- **Broken link** (exit 1, fails build): a `related:` slug, inline
  `/wiki/<id>/` link, or `[[wikilink]]` that points to a non-existent page.
- **Orphan warning** (exit 0): a wiki page nothing else links to.
- **Draft-aware**: links from/to draft pages are skipped.
- Code spans and `<code>` blocks are stripped before checking, so literal
  `[[examples]]` in docs don't false-positive.

## Adding a new wiki page

1. Create `src/content/wiki/<slug>.md` with required frontmatter.
2. Link to it from at least one other page (or from `index.md`) to avoid
   orphan warning.
3. `npm run check:links` to verify. `npm run build` to confirm.

## Adding a new tutorial series

1. Create `src/content/tutorials/<series>/index.md` with series frontmatter.
2. Add lesson files: `01-intro.md`, `02-next.md`, …
3. `npm run build` — series and lesson pages generate automatically.

## Layout props (WikiLayout.astro)

```typescript
{
  title: string           // required — sets <title> and <h1> (caller renders <h1>)
  description?: string    // sets <meta name="description">
  headings?: MarkdownHeading[]  // enables TOC sidebar on desktop (lg:)
  crumbs?: { label: string; href?: string }[]  // breadcrumb trail
}
```

Breadcrumbs are built in each page file and passed as `crumbs`. The layout
does not compute them — it only renders them.

## Pagefind (full-text search)

- `npm run build` runs `pagefind --site dist` as a `postbuild` script.
- `/search/` uses the Pagefind JS API directly — NOT the default UI component
  (which ships its own styles). Results render as plain `<ul>`.
- `/pagefind/pagefind.js` is marked external in Vite config so it is not
  bundled at build time.
- In dev mode (`npm run dev`), search shows a graceful "unavailable" message.
  To test search: `npm run build && npm run preview`.

## Do not do these things

- Do not add React, Vue, Svelte, or any other JS framework.
- Do not use Tailwind for colors, typography, or decorative styles.
- Do not re-enable Tailwind's Preflight reset.
- Do not add `class` attributes for visual styling — use semantic HTML elements.
- Do not use `getCollection('wiki')` directly — use `getWikiPages()` from
  `src/lib/wiki.ts` so draft filtering applies everywhere consistently.
- Do not use `getCollection('tutorials')` directly — use `getTutorialPages()`.
- Do not hardcode `/wiki/<id>/` links in `.astro` files when you can use the
  collection entry's id dynamically.
- Do not commit the `dist/` or `.astro/` directories.
