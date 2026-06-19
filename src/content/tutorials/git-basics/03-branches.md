---
title: Branches
description: Work on features in isolation and merge them back when ready.
order: 3
updated: 2026-06-11
---

A branch is a pointer to a specific commit. When you make a new commit, the
pointer moves forward. The default branch is usually called `main` (or `master`
in older repos).

## Create a branch

```bash
git branch feature-login
```

This creates the branch but does not switch to it.

## Switch to the branch

```bash
git checkout feature-login
# or, with newer Git:
git switch feature-login
```

Create and switch in one command:

```bash
git switch -c feature-login
```

## Work, commit, repeat

Make changes and commit normally. Commits go onto `feature-login`, not `main`.
`main` stays untouched until you merge.

## Merge back to main

```bash
git switch main
git merge feature-login
```

If both branches changed *different* files, Git merges automatically. If both
changed the *same lines* of the same file, you get a **merge conflict** — Git
asks you to resolve it manually.

## Delete the branch after merging

```bash
git branch -d feature-login
```

The `-d` flag only deletes if the branch has been merged. Use `-D` to force
delete an unmerged branch.

## Why branches matter

Branches are cheap in Git — they are just a 40-byte pointer. Create one for
every new feature or bug fix. Keep `main` always in a working state, and merge
only when the work is done and tested.
