import rss from '@astrojs/rss';
import { getWikiPages } from '../lib/wiki';
import { getTutorialPages, isIndex } from '../lib/tutorial';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const site = context.site ?? new URL('http://localhost:4321');

  const wikiPages = (await getWikiPages())
    .filter((p) => p.id !== 'index' && p.data.updated instanceof Date)
    .map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.updated!,
      link: `/wiki/${p.id}/`,
    }));

  // Only include tutorial lessons (not series index pages).
  const tutorialPages = (await getTutorialPages())
    .filter((p) => !isIndex(p.id) && p.data.updated instanceof Date)
    .map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.updated!,
      link: `/tutorial/${p.id.replace('/', '/')}/`,
    }));

  const items = [...wikiPages, ...tutorialPages]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Personal Wiki',
    description: 'Notes and tutorials from a personal wiki.',
    site,
    items,
  });
}
