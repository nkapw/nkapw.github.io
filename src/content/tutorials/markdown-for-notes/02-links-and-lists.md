---
title: Links and Lists
description: Connecting ideas and structuring information.
order: 2
updated: 2026-06-09
---

## Links

```markdown
[link text](https://example.com)
[relative link](../other-page/)
```

For reference-style links — cleaner when you have many links in a paragraph:

```markdown
Read the [Markdown spec][spec] for full details.

[spec]: https://spec.commonmark.org
```

## Images

Same syntax as links, with a `!` prefix. The text in brackets is the alt text.

```markdown
![A diagram of the process](./diagram.png)
```

## Unordered lists

```markdown
- First item
- Second item
  - Nested item (two spaces of indent)
- Third item
```

Use `-` consistently. Some renderers accept `*` or `+` but `-` is least
ambiguous.

## Ordered lists

```markdown
1. First step
2. Second step
3. Third step
```

The actual numbers do not matter — most renderers renumber them. Writing
`1. 1. 1.` throughout makes reordering painless.

## Task lists

Supported by GitHub, Obsidian, and most modern Markdown apps:

```markdown
- [x] Done
- [ ] Not done
```

## When to use lists vs. prose

Lists are for genuinely enumerable things: steps, options, ingredients. Do not
break flowing argument into bullets — it loses the connective tissue between
ideas. If you find yourself writing one-word bullets, write prose instead.
