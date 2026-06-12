import rss from '@astrojs/rss';
import { getWikiPages } from '../lib/wiki';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const pages = (await getWikiPages())
    .filter((p) => p.id !== 'index' && p.data.updated instanceof Date)
    .sort((a, b) => b.data.updated!.getTime() - a.data.updated!.getTime());

  return rss({
    title: 'Personal Wiki',
    description: 'A personal wiki on knowledge management.',
    site: context.site ?? 'http://localhost:4321',
    items: pages.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.updated!,
      link: `/wiki/${p.id}/`,
    })),
  });
}
