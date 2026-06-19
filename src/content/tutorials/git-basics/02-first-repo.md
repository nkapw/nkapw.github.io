---
title: Your First Repository
description: Initialize a repo, stage files, and make your first commit.
order: 2
updated: 2026-06-10
---

A repository is just a folder with a hidden `.git` directory inside it. Let's
create one from scratch.

## Initialize

```bash
mkdir my-project
cd my-project
git init
```

Git will say: `Initialized empty Git repository in .../my-project/.git/`

## Create a file

```bash
echo "# My project" > README.md
```

## Check status

```bash
git status
```

Git will show `README.md` as an **untracked file** — it knows the file exists
but is not yet recording changes to it.

## Stage the file

```bash
git add README.md
```

Staging means "include this in the next commit". You can stage individual files
or everything at once with `git add .`.

## Commit

```bash
git commit -m "Initial commit"
```

The `-m` flag sets the commit message inline. Write messages in the imperative:
*"Add README"* not *"Added README"*.

## View the history

```bash
git log --oneline
```

You will see one line: the short commit hash and your message.

## The staging area: why bother?

The staging area lets you craft a commit out of *part* of your changes. If you
edited ten files but only three are ready, stage only those three. The others
stay in your working directory for the next commit.
