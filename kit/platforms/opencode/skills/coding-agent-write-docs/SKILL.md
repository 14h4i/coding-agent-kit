---
name: coding-agent-write-docs
description: >
  Use when asked to write, update, or improve documentation in docs/. Applies
  after large code changes, after adding a new feature, or when the user says
  "update the docs", "write documentation", "document this".
---

<!-- CODING_AGENT_KIT_MANAGED version=1.1.0 -->

## Principles

- Write for someone unfamiliar with the project
- Keep it concise with clear structure
- Prefer updating existing files over creating new ones
- Avoid duplicate or outdated documentation

## Standard docs/ structure

```
docs/
├── architecture.md   ← overview, stack, directory structure
├── conventions.md    ← naming, patterns, dos/don'ts
├── flows.md          ← business flows, sequences
├── setup.md          ← dev environment setup
├── api.md            ← API behavior (if applicable)
└── plans/            ← design docs and implementation plans
                         (managed by coding-agent-brainstorm-feature / coding-agent-write-plan,
                         not edited directly by this skill)
```

## When updating

1. Read the existing file first
2. Only edit the relevant section
3. Keep the existing format and style
4. Update the correct section — don't just append to the end

## Format

- H1 for the file title, H2 for main sections
- Code blocks for every command and snippet
- Tables for multi-attribute lists
- Active voice, concise wording
