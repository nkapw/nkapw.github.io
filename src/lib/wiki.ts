import { getCollection, type CollectionEntry } from 'astro:content';

export type WikiEntry = CollectionEntry<'wiki'>;

// All wiki pages, with drafts hidden in production but visible in dev.
export const getWikiPages = () =>
  getCollection('wiki', ({ data }) => (import.meta.env.PROD ? !data.draft : true));

// Turn a tag into a URL-safe slug: "Niklas Luhmann" -> "niklas-luhmann".
export const slugifyTag = (tag: string) =>
  tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Page ids referenced from a body — both [markdown](/wiki/<id>/) links and
// [[wikilink]] / [[wikilink|label]] syntax.
export function extractBodyRefs(body: string): string[] {
  const refs: string[] = [];
  for (const [, id] of body.matchAll(/\/wiki\/([a-z0-9\-/]+)\//g)) refs.push(id);
  for (const [, inner] of body.matchAll(/\[\[([^\]]+)\]\]/g)) refs.push(inner.split('|')[0].trim());
  return refs;
}

// Pages that link TO `targetId` — either via curated `related` frontmatter
// or via an inline body link to /wiki/<targetId>/. Sorted by title.
export function getBacklinks(targetId: string, all: WikiEntry[]): WikiEntry[] {
  return all
    .filter((p) => {
      if (p.id === targetId) return false;
      const viaRelated = (p.data.related ?? []).includes(targetId);
      const viaBody = extractBodyRefs(p.body ?? '').includes(targetId);
      return viaRelated || viaBody;
    })
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
}

// Group pages by tag (slug as key, first-seen label kept for display).
export function getTagGroups(all: WikiEntry[]) {
  const map = new Map<string, { tag: string; slug: string; pages: WikiEntry[] }>();
  for (const p of all) {
    for (const tag of p.data.tags ?? []) {
      const slug = slugifyTag(tag);
      const group = map.get(slug) ?? { tag, slug, pages: [] };
      group.pages.push(p);
      map.set(slug, group);
    }
  }
  return [...map.values()].sort((a, b) => a.tag.localeCompare(b.tag));
}
