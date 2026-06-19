import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Astro 5 Content Layer: load Markdown/MDX files from src/content/wiki.
const wiki = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/wiki' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    updated: z.coerce.date().optional(),
    // Slugs (ids) of related wiki pages.
    related: z.array(z.string()).optional(),
    // Draft pages are hidden in production builds, visible in dev.
    draft: z.boolean().default(false),
  }),
});

// One collection for everything under src/content/tutorials/.
// Series entries have ids ending in "/index" (e.g. "git-basics/index").
// Lesson entries are everything else (e.g. "git-basics/01-init").
const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tutorials' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    // Explicit display order. For lessons, filename prefix (01-, 02-…) is
    // used as a fallback when order is not set.
    order: z.number().default(0),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { wiki, tutorials };
