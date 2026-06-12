/*
 * remark-wikilinks — turn [[slug]] and [[slug|label]] into links to
 * /wiki/<slug>/. Unknown slugs render as plain text followed by a "[?]"
 * marker so broken links are visible without any custom CSS.
 *
 * `options.validIds` is a Set of known page ids (computed in astro.config).
 */
const WIKILINK = /\[\[([^\]]+)\]\]/g;

export function remarkWikilinks(options = {}) {
  const validIds = options.validIds ?? new Set();

  // Replace a text node containing [[...]] with a mix of text and link nodes.
  function splitTextNode(value) {
    const out = [];
    let last = 0;
    for (const match of value.matchAll(WIKILINK)) {
      const [full, inner] = match;
      const start = match.index;
      if (start > last) out.push({ type: 'text', value: value.slice(last, start) });

      const [target, label] = inner.split('|').map((s) => s.trim());
      const text = label || target;
      if (validIds.has(target)) {
        out.push({ type: 'link', url: `/wiki/${target}/`, children: [{ type: 'text', value: text }] });
      } else {
        out.push({ type: 'text', value: `${text} [?]` });
      }
      last = start + full.length;
    }
    if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
    return out;
  }

  function walk(node) {
    if (!Array.isArray(node.children)) return;
    const next = [];
    for (const child of node.children) {
      // Only plain text nodes carry wikilinks; code/inlineCode are untouched.
      if (child.type === 'text' && child.value.includes('[[')) {
        next.push(...splitTextNode(child.value));
      } else {
        walk(child);
        next.push(child);
      }
    }
    node.children = next;
  }

  return (tree) => walk(tree);
}
