---
title: What is Git?
description: Understanding version control and why Git exists.
order: 1
updated: 2026-06-10
---

Git is a **distributed version control system**. It tracks changes to files over
time so you can recall specific versions later, collaborate with others, and
undo mistakes.

## The problem Git solves

Before version control, people kept files like this:

```
report.docx
report_final.docx
report_final2.docx
report_FINAL_v3_USE_THIS.docx
```

Git replaces this chaos with a clean history of *snapshots*, each with a message
explaining what changed and why.

## Key concepts

- **Repository (repo)** — a folder Git is tracking. Contains all your files plus
  the full history of every change ever made to them.
- **Commit** — a saved snapshot. Each commit has a unique ID, an author, a
  timestamp, and a message.
- **Branch** — a parallel line of development. You can work on a feature in a
  branch without touching the main codebase.

## Distributed means no single point of failure

Every copy of a Git repository is a full copy — full history included. There is
no "server" that, if it dies, takes your history with it. GitHub, GitLab, and
similar services are just convenient places to store a shared copy; the real
repository lives on every contributor's machine.

## Check if Git is installed

```bash
git --version
```

If you see a version number, you are ready. If not, download Git from
[git-scm.com](https://git-scm.com).
