import { getCollection, type CollectionEntry } from 'astro:content';

export type TutorialEntry = CollectionEntry<'tutorials'>;

// Draft-aware collection getter (same pattern as wiki).
export const getTutorialPages = () =>
  getCollection('tutorials', ({ data }) => (import.meta.env.PROD ? !data.draft : true));

// "git-basics"             → series slug: "git-basics"
// "git-basics/01-init"    → series slug: "git-basics"
export const seriesSlug = (id: string) => id.split('/')[0];

// Astro's glob loader normalises "folder/index.md" → id "folder" (strips /index).
// A series entry therefore has NO slash in its id.
// "git-basics"        → true   (normalised by Astro)
// "git-basics/index"  → true   (explicit, kept for safety)
// "git-basics/01-init"→ false
export const isIndex = (id: string) =>
  !id.includes('/') || id.endsWith('/index');

// "git-basics/01-init" → lesson slug: "01-init"
export const lessonSlug = (id: string) => id.split('/').slice(1).join('/');

// Find the series entry for a given series slug.
export function getSeriesEntry(all: TutorialEntry[], slug: string) {
  return all.find((e) => isIndex(e.id) && seriesSlug(e.id) === slug);
}

// All series index entries, sorted by order then title.
export function getAllSeries(all: TutorialEntry[]) {
  return all
    .filter((e) => isIndex(e.id))
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

// Lessons for a given series slug, sorted by order then id (filename prefix).
export function getLessons(all: TutorialEntry[], slug: string) {
  return all
    .filter((e) => seriesSlug(e.id) === slug && !isIndex(e.id))
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
