---
name: coding-agent-scan-project
description: >
  Use when starting work on an unfamiliar project, when asked to "understand
  this project", "scan the project", "analyze the codebase", or before making
  large changes. Scans the entire codebase to understand structure, stack,
  patterns, and conventions, then generates the full opencode setup.
---

## Process

### Step 1 — Discover structure (read-only)

1. Root: `ls -la`, read README.md
2. Package manager: package.json / go.mod / Cargo.toml / pyproject.toml / composer.json
3. Structure: `find . -maxdepth 3 -type d | grep -v node_modules | grep -v .git`
4. Config files: .env.example, docker-compose.yml, CI/CD files
5. Existing docs: docs/, CONTRIBUTING.md

### Step 2 — Analyze in depth

- Identify: language, framework, runtime version
- Find patterns: naming conventions, folder structure, test strategy
- Identify: build / test / lint / dev commands
- Find: critical files that shouldn't be edited carelessly (.env, migrations, auth)

### Step 3 — Create docs/

**docs/architecture.md**
- System overview (1–2 paragraphs)
- Stack and versions
- Main directory structure and purpose of each
- Core flow
- Important technical decisions

**docs/conventions.md**
- Naming conventions (files, functions, variables, components)
- Common patterns used
- What NOT to do
- Import/export style

**docs/flows.md**
- Main business flows (auth, data flow, API)
- Sequence of key steps

**docs/plans/** — leave this empty for now; it's where `coding-agent-brainstorm-feature`
and `coding-agent-write-plan` will save design docs and implementation plans for future
work. No need to create files here during scan.

### Step 4 — Create per-project AGENTS.md

Create `AGENTS.md` at root with:

```
# [Project name]

[Short 1-2 sentence description]

## Stack
- [language + version]
- [framework + version]
- [database, cache if any]

## Commands
- Dev: `[command]`
- Build: `[command]`
- Test: `[command]` ← run before reporting done
- Lint: `[command]`

## Structure
- `[dir]/` — [purpose]

## Conventions
- [most important naming rule]
- [required pattern]
- [most important thing not to do]

## Off-limits
- [file/area not to edit carelessly]

## Refs
- docs/architecture.md
- docs/conventions.md
- docs/flows.md
```

### Step 5 — Create .opencode/opencode.json

Override permissions for common workflows (edit/write allow, lint/test allow,
build ask). Add MCP servers relevant to the stack.

### Step 6 — Generate per-project skills via coding-agent-skill-creator

Based on everything learned in Steps 1–2, decide which skills would be
genuinely useful for this project's daily work. Only generate skills with
clear, repeated use cases — don't create skills for things done once.

**Common signals and corresponding skills:**

| Signal from scan | Skill to generate |
|---|---|
| React/Vue/Svelte components with consistent structure | `create-component` |
| REST or GraphQL API routes with consistent pattern | `create-api-route` |
| ORM models or DB migrations with consistent pattern | `create-model` |
| Test files with consistent structure and helpers | `create-test` |
| Repeated utility/helper pattern | `create-util` |

Present the list to the user and confirm before creating. If the user
approves, for each skill:

1. Find the best **reference file** in the codebase — a real existing file
   that exemplifies the pattern (e.g. `src/components/ui/Button.tsx` for
   `create-component`). If no reference file exists, note that.

2. Build a context object:

```
{
  name: "<project-specific-skill-name>",
  location: "per-project",
  purpose: "<one sentence: what this skill creates>",
  triggers: ["create a component", "add a new component", ...],
  reference_file: "<actual file path, or empty string if none>",
  pattern_notes: "<what was observed about the pattern in that file>"
}
```

3. Call `coding-agent-skill-creator` with this context object — it will read the
   reference file and generate the SKILL.md. Do not write the SKILL.md
   directly from coding-agent-scan-project.

Repeat for each approved skill, one at a time.

### Report

Summarize: stack found, files created, skills generated, anything needing
confirmation. Mention that `/brainstorm` and `/plan` are available for
planning future feature work, and `/skill-new` can add more skills later.
