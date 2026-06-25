---
name: coding-agent-skill-creator
description: >
  Use when the user wants to create a new Codex skill, add a repo-scoped or
  personal workflow, or says "create a skill", "add a skill", or "I want
  Codex to know how to do X". Also use when another coding-agent-kit skill
  passes a concrete context object for generating a project skill.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.1.0 -->

## Modes

### Interactive

Use when the user directly asks for a skill. Ask the missing questions, then
create the skill.

### Programmatic

Use when another skill provides this object:

```json
{
  "name": "project-specific-skill-name",
  "location": "repo" | "personal",
  "purpose": "what the skill does",
  "triggers": ["phrases the user would say"],
  "reference_file": "path/to/reference.ext",
  "pattern_notes": "observed pattern"
}
```

Skip questions already answered by the object.

## Process

### Step 1 - Clarify

Ask only what is missing:

- What should the skill do?
- What exact user phrases should trigger it?
- What input and output should it expect?
- Repo-scoped (`.agents/skills/`) or personal (`~/.agents/skills/`)?
- Is there a real reference file that shows the pattern?

### Step 2 - Read the Reference

If a reference file exists, read it before writing the skill. Derive the
template and steps from the actual codebase.

If no reference exists, say that the template is derived from observed stack
conventions.

### Step 3 - Create the Skill

For project-specific skills, choose names that match the project's domain and
patterns instead of adding a kit prefix. Good names are short, kebab-case, and
action-oriented, such as `create-component`, `add-api-route`, `write-migration`,
or `billing-create-invoice`.

Location:

- Repo: `.agents/skills/<name>/SKILL.md`
- Personal: `~/.agents/skills/<name>/SKILL.md`

Required format:

```md
---
name: <skill-name>
description: >
  What the skill does, exact trigger phrases, expected output, and boundaries.
---

## Pattern

Reference: `<path or "none">`

<Observed pattern from the codebase.>

## Template

<Concrete template with placeholders only where values vary.>

## Steps

1. <Concrete step>
2. <Concrete step>

## Verify

<Actual command or manual check for this project.>
```

### Step 4 - Self-Check

Before saving, verify:

- The skill name is lowercase kebab-case.
- The skill name matches the project's domain and pattern, not the kit brand.
- The description has real trigger phrases.
- The template is based on the reference or observed conventions.
- Paths match the project.
- Verify commands exist in project docs or `AGENTS.md`.
- There are no TODO placeholders.

### Step 5 - Report

Report skill name, location, reference file, and one-line summary.
