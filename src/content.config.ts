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

export const collections = { wiki };
