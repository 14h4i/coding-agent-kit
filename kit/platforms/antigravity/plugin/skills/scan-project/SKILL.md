---
name: scan-project
description: >
  Use when starting work on an unfamiliar project, when asked to "understand
  this project", "scan the project", "analyze the codebase", or before making
  large changes. Read the repository, document its architecture, create
  Antigravity project guidance, and suggest useful repo-scoped skills.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.0 -->

## Process

### Step 1 - Discover Structure

Read only at first:

1. Repository root listing and `README.md`.
2. Package or runtime files such as `package.json`, `go.mod`, `Cargo.toml`,
   `pyproject.toml`, or `composer.json`.
3. Directory structure, excluding generated folders.
4. Existing docs, `CONTRIBUTING.md`, `.agents/rules/`, and existing `GEMINI.md` or `AGENTS.md` guidance.
5. Config files that reveal commands or conventions. Do not edit secrets.

### Step 2 - Analyze

Identify:

- Language, framework, runtime, and package manager.
- Build, test, lint, and dev commands.
- Directory responsibilities.
- Naming and import/export conventions.
- Critical files or folders that should not be edited casually.
- Repeated patterns that could justify repo-scoped skills.

### Step 3 - Create or Update Docs

Create or update:

- `docs/architecture.md` - overview, stack, directory structure, core flow.
- `docs/conventions.md` - naming, patterns, commands, what not to do.
- `docs/flows.md` - key user, data, API, or build flows.
- `docs/plans/` - create the directory, but do not add placeholder files.

Prefer updating existing docs over creating duplicates.

### Step 4 - Create Project Antigravity Rules

Create or update `.agents/rules/project-guidance.md` with:

```md
# <Project name>

<Short description>

## Stack
- <language/runtime>
- <framework>
- <database/cache if any>

## Commands
- Dev: `<command>`
- Build: `<command>`
- Test: `<command>`
- Lint: `<command>`

## Structure
- `<dir>/` - <purpose>

## Conventions
- <important rule>

## Off-limits
- <file or area>

## Refs
- docs/architecture.md
- docs/conventions.md
- docs/flows.md
```

Do not create `.opencode/`, `.codex/`, `.claude/`, Antigravity settings, hooks, sidecars, or MCP config unless the user explicitly approves a project config change.

### Step 5 - Suggest Repo-Scoped Skills

Suggest `.agents/skills/<project-specific-name>/SKILL.md` only for repeated
workflows found in the actual codebase. Generated project skills should use
names that match the project's domain and patterns, not the kit brand.

Examples:

| Signal | Skill |
|---|---|
| Consistent component pattern | `create-component` |
| Consistent API route pattern | `create-api-route` |
| Consistent test pattern | `create-test` |
| Consistent model or migration pattern | `create-model` |

Ask for confirmation before creating repo-scoped skills.

### Step 6 - Create Approved Skills

For each approved skill:

1. Pick a real reference file from the repo.
2. Use the `skill-creator` skill from this plugin.
3. Place the skill under `.agents/skills/<project-specific-name>/SKILL.md`.

### Report

Summarize the stack, files created or updated, commands found, suggested or
created skills, and anything that needs confirmation.
