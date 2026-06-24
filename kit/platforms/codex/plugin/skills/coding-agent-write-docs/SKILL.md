---
name: coding-agent-write-docs
description: >
  Use when asked to write, update, or improve project documentation in docs/,
  after a large code change, after adding a feature, or when the user says
  "update the docs", "write documentation", or "document this".
---

<!-- CODING_AGENT_KIT_MANAGED version=1.0.2 -->

## Principles

- Write for someone unfamiliar with the project.
- Keep docs concise and structured.
- Prefer updating existing docs over creating new files.
- Avoid duplicate or stale documentation.
- Document behavior, architecture, setup, and decisions with long-term value.

## Standard Structure

```text
docs/
├── architecture.md
├── conventions.md
├── flows.md
├── setup.md
├── api.md
└── plans/
```

Only create files that are useful for the current project.

## Process

1. Read existing docs first.
2. Identify the exact section that should change.
3. Update that section in place when possible.
4. Keep the existing format and tone.
5. Add commands and code snippets in fenced code blocks.
6. Use tables for structured comparisons or lists with repeated attributes.

## Avoid

- Appending disconnected notes to the bottom of a file.
- Creating duplicate docs for the same topic.
- Recording temporary implementation chatter.
- Documenting secrets, credentials, or local-only paths unless necessary and safe.
