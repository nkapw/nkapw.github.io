---
title: Headings, Paragraphs, and Emphasis
description: The core building blocks of any Markdown document.
order: 1
updated: 2026-06-09
---

Markdown is plain text with lightweight punctuation that signals formatting.
A Markdown file is readable as-is and renders into HTML anywhere — GitHub,
Obsidian, this wiki, your terminal pager.

## Headings

Prefix a line with `#` signs. One `#` is the top-level heading; add more for
sub-levels.

```markdown
# Page title
## Section
### Sub-section
```

Use headings to show structure, not for visual size. Screen readers and table-
of-contents generators rely on the hierarchy.

## Paragraphs

A blank line creates a new paragraph. A single line break inside a paragraph is
ignored — the text flows together.

```markdown
First paragraph.

Second paragraph. Still second paragraph
even though this is a new line in the source.
```

## Emphasis

```markdown
*italic* or _italic_
**bold** or __bold__
***bold italic***
~~strikethrough~~
```

Use emphasis sparingly. If everything is bold, nothing is bold.

## Inline code

Wrap with backticks:

```markdown
Use `git status` to check the state of your repo.
```

Renders as: Use `git status` to check the state of your repo.
