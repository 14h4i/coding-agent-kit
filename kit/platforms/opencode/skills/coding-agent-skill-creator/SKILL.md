---
name: coding-agent-skill-creator
description: >
  Use when the user wants to create a new skill — when they say "create a
  skill", "add a skill", "I want the agent to know how to do X", or
  "/skill-new". Also called programmatically by coding-agent-scan-project with
  a pre-built context object — in that case skip the questions and go straight
  to Step 3.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.0 -->

## Two modes

**Interactive** (user initiated) — ask questions in Step 1, then create.

**Programmatic** (called by coding-agent-scan-project) — receives a context
object with all answers already filled in. Skip Step 1 entirely, go straight
to Step 2.

Context object shape when called programmatically:

```
{
  name: string,          // kebab-case skill name
  location: "per-project" | "global",
  purpose: string,       // what the skill does
  triggers: string[],    // real phrases the user would say
  reference_file: string // actual file path from the codebase to use as pattern
  pattern_notes: string  // what was observed about the pattern in that file
}
```

---

## Process

### Step 1 — Ask questions (interactive mode only)

Skip this step if called programmatically with a context object.

- What exactly should this skill do?
- When will the user need it? (real trigger phrases they would say)
- Expected input/output?
- Global (`~/.config/opencode/skills/`) or per-project (`.opencode/skills/`)?
- Is there an existing file in the codebase that shows the pattern this skill
  should follow? (if yes, read it before Step 3)

### Step 2 — Read the reference file

If a `reference_file` was provided (programmatic) or the user named one
(interactive), read its full content before writing the skill. The skill's
template and pattern must be derived from what's actually in that file — not
invented.

If no reference file exists (the pattern doesn't exist in the codebase yet),
note this in the skill and write a best-guess template based on the stack's
conventions.

### Step 3 — Create the SKILL.md

For project-specific skills, choose names that match the project's domain and
patterns instead of adding a kit prefix. Good names are short, kebab-case, and
action-oriented, such as `create-component`, `add-api-route`, `write-migration`,
or `billing-create-invoice`.

Location:
- Global: `~/.config/opencode/skills/<name>/SKILL.md`
- Per-project: `.opencode/skills/<name>/SKILL.md`

Required format:

```markdown
---
name: <skill-name-kebab-case>
description: >
  2-4 sentences: what the skill does, when to use it (real trigger phrases
  the user would say), what it produces.
---

## Pattern

Reference: `<path to reference file, or "none — derived from stack conventions">`

<Describe the pattern as observed in the reference file: structure, naming,
imports, exports. Be specific — use actual names and paths from the file.>

## Template

<Actual code template derived from the reference file. Use placeholders only
for the parts that vary — e.g. {{ComponentName}}, {{routePath}}.
Everything else should mirror the real file's structure.>

## Steps

1. Create `<actual path pattern based on this codebase>/<Name>.<ext>`
2. <Any additional steps specific to this project: export from index,
   register in router, etc. Only include steps that are actually needed
   in this codebase — don't invent steps.>

## Verify

<How to confirm it works in this project — the actual dev/test/typecheck
command found during scan.>
```

### Step 4 — Self-check before saving

Before writing the file, verify:

- [ ] `description` contains real trigger phrases (words the user would say),
  not internal skill names
- [ ] Skill name matches the project's domain and pattern, not the kit brand
- [ ] Template is derived from the reference file, not invented from scratch
- [ ] File path in Steps uses the actual directory structure of this project
- [ ] Verify command matches the actual command in the project's AGENTS.md
- [ ] No steps that reference things that don't exist in this codebase

Fix any issues, then save the file.

### Step 5 — Confirm

After saving, report:
- Skill name and location
- Reference file used (or "none")
- One-line summary of what the skill does
