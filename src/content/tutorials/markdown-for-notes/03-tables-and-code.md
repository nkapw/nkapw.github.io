---
title: Tables and Code Blocks
description: Structured data and formatted code in plain text.
order: 3
updated: 2026-06-09
---

## Code blocks

Fence with three backticks. Add a language name for syntax highlighting.

````markdown
```python
def greet(name):
    return f"Hello, {name}"
```
````

Without a language name, the block renders as plain monospace — still useful for
terminal output, file contents, or any preformatted text.

## Tables

```markdown
| Column A | Column B | Column C |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

Alignment with colons in the separator row:

```markdown
| Left     | Center   | Right    |
|:---------|:--------:|---------:|
| text     | text     | text     |
```

Tables are useful for comparison — tool features, option trade-offs, reference
data. Avoid them for content that reads naturally as prose or a list.

## Blockquotes

```markdown
> The best way to predict the future is to invent it.
> — Alan Kay
```

Nest blockquotes with `>>`. Use them for quoted material or asides, not for
general emphasis.

## Horizontal rules

```markdown
---
```

A line of three or more dashes. Useful as a section break between clearly
distinct parts of a long document.

## The portability principle

Plain Markdown files open in any text editor, render on any platform, and will
still be readable in twenty years. Keep that portability by avoiding
app-specific extensions when standard Markdown covers your need.
